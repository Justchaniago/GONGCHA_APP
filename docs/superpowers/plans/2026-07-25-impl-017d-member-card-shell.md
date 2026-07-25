# IMPL-017D — Member Card Visual Shell Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the V1 Member Card modal (layout, BlurView backdrop, spring entrance, drag/swipe dismiss animation, tier badge, and points display) into shared pure presentation (`MemberCardShellView`), while creating legacy and local application presenters to preserve exact V1 presentation and keep QR payload generation gated until security/token policy is approved (D-128).

**Architecture:** 
Extract presentation logic from `src/components/MemberCardModal.tsx` into `src/presentation/memberCardShell/MemberCardShellView.tsx`. Define `MemberCardShellViewModel` in `src/application/memberCardShell/MemberCardShellViewModel.ts` with two presenter builders (`buildLegacyMemberCardShellViewModel` and `buildLocalMemberCardShellViewModel`). Wrap legacy usage in `src/components/MemberCardModal.tsx` and create `src/components/LocalMemberCardModal.tsx` for the isolated local FastAPI harness.

**Tech Stack:** React Native, Expo Blur, Expo Linear Gradient, Jest / Node test runner, TypeScript.

## Global Constraints

- Preserve 100% of V1 animation (entrance spring damping 20/stiffness 135, backdrop fade 280ms, dragY interpolate, PanResponder dy < -85 swipe dismiss).
- Shared presentation view (`MemberCardShellView.tsx`) must NOT import React context, Firebase, Firestore, repository, service, DTO, or economic logic.
- Local wrapper must NOT generate or display real/local QR code payloads until approved (D-128); display placeholder or disabled QR state for local FastAPI wrapper.
- Candidate tier themes for local: Lover (red `#EF4444`), Master (silver `#9CA3AF`), Ambassador (gold `#F59E0B`), Legend (black `#111827`).
- All existing tests and TypeScript checks must pass (`npx tsc --noEmit`).

---

### Task 1: Create View Model and Presenters (`src/application/memberCardShell/MemberCardShellViewModel.ts`)

**Files:**
- Create: `gongcha_app/src/application/memberCardShell/MemberCardShellViewModel.ts`
- Create: `gongcha_app/tests/member-card-shell/member-card-shell-viewmodel.test.mjs`

**Interfaces:**
- Consumes: Legacy member data (from `MemberContext`), FastAPI member projection + Loyalty summary.
- Produces: `MemberCardShellViewModel`, `buildLegacyMemberCardShellViewModel`, `buildLocalMemberCardShellViewModel`.

- [ ] **Step 1: Write failing test for MemberCardShellViewModel builders**

Create `gongcha_app/tests/member-card-shell/member-card-shell-viewmodel.test.mjs`:
```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLegacyMemberCardShellViewModel,
  buildLocalMemberCardShellViewModel,
} from '../../src/application/memberCardShell/MemberCardShellViewModel.ts';

test('buildLegacyMemberCardShellViewModel formats legacy member data correctly', () => {
  const legacyMember = {
    uid: 'user-123',
    fullName: 'John Doe',
    currentPoints: 1250,
    pendingPoints: 50,
    tier: 'Gold',
    joinDate: '2026-01-01T00:00:00.000Z',
  };
  const vm = buildLegacyMemberCardShellViewModel(true, { x: 100, y: 200, size: 40 }, legacyMember);

  assert.equal(vm.visible, true);
  assert.equal(vm.memberName, 'John Doe');
  assert.equal(vm.availableLeavesText, '1.250');
  assert.equal(vm.pendingLeavesText, '50 pending');
  assert.equal(vm.tierName, 'GOLD');
  assert.equal(vm.qrValue, 'user-123');
  assert.equal(vm.showQrCode, true);
});

test('buildLocalMemberCardShellViewModel formats FastAPI summary correctly with disabled QR', () => {
  const member = {
    displayName: 'Jane Smith',
    createdAt: '2026-02-15T00:00:00.000Z',
  };
  const summary = {
    tier: 'AMBASSADOR',
    availableLeaves: 3400,
    qualifyingLeaves: 4200,
  };
  const vm = buildLocalMemberCardShellViewModel(true, null, member, summary);

  assert.equal(vm.visible, true);
  assert.equal(vm.memberName, 'Jane Smith');
  assert.equal(vm.availableLeavesText, '3.400');
  assert.equal(vm.pendingLeavesText, '— / Not supported yet');
  assert.equal(vm.tierName, 'AMBASSADOR');
  assert.equal(vm.showQrCode, false);
  assert.equal(vm.qrPlaceholderText, 'QR payload gated until security policy approved');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/member-card-shell/member-card-shell-viewmodel.test.mjs`
Expected: FAIL with module not found / function not defined.

- [ ] **Step 3: Write minimal implementation in MemberCardShellViewModel.ts**

Create `gongcha_app/src/application/memberCardShell/MemberCardShellViewModel.ts`:
```ts
export interface CardAnchor {
  x: number;
  y: number;
  size: number;
}

export interface TierTheme {
  gradient: readonly [string, string];
  text: string;
  glow: string;
}

export const CANDIDATE_TIER_THEMES: Record<string, TierTheme> = {
  LOVER: { gradient: ['#FCA5A5', '#EF4444'], text: '#FFFFFF', glow: '#EF4444' },
  MASTER: { gradient: ['#E8E8E8', '#B8B8B8'], text: '#1A1A1A', glow: '#E8E8E8' },
  AMBASSADOR: { gradient: ['#FDE68A', '#F59E0B'], text: '#1A1A1A', glow: '#F59E0B' },
  LEGEND: { gradient: ['#374151', '#111827'], text: '#FFFFFF', glow: '#111827' },
  // Legacy backups
  SILVER: { gradient: ['#E8E8E8', '#B8B8B8'], text: '#1A1A1A', glow: '#E8E8E8' },
  GOLD: { gradient: ['#FFD700', '#FFA500'], text: '#1A1A1A', glow: '#FFD700' },
  PLATINUM: { gradient: ['#E0E7FF', '#C7D2FE'], text: '#312E81', glow: '#C7D2FE' },
};

export interface MemberCardShellViewModel {
  visible: boolean;
  anchor: CardAnchor | null;
  memberName: string;
  joinDateText: string;
  tierName: string;
  theme: TierTheme;
  availableLeavesText: string;
  pendingLeavesText: string;
  pendingExplanationText: string;
  showQrCode: boolean;
  qrValue: string;
  qrPlaceholderText: string;
}

export function buildLegacyMemberCardShellViewModel(
  isCardVisible: boolean,
  anchor: CardAnchor | null,
  member: any
): MemberCardShellViewModel {
  const tierKey = (member?.tier ?? 'Silver').toUpperCase();
  const theme = CANDIDATE_TIER_THEMES[tierKey] ?? CANDIDATE_TIER_THEMES.SILVER;
  const currentPoints = member?.currentPoints ?? member?.points ?? 0;
  const pendingPoints = member?.pendingPoints ?? 0;

  let joinDateText = '';
  if (member?.joinDate) {
    joinDateText = `Joined ${new Date(member.joinDate).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  }

  return {
    visible: isCardVisible,
    anchor: anchor ?? null,
    memberName: member?.fullName ?? 'Guest',
    joinDateText,
    tierName: (member?.tier ?? 'Silver').toUpperCase(),
    theme,
    availableLeavesText: currentPoints.toLocaleString('id-ID'),
    pendingLeavesText: `${pendingPoints.toLocaleString('id-ID')} pending`,
    pendingExplanationText:
      pendingPoints > 0
        ? 'Pending points stay on hold until admin validation is completed.'
        : 'New earn points will appear here while waiting for validation.',
    showQrCode: Boolean(member?.uid),
    qrValue: member?.uid ?? '',
    qrPlaceholderText: 'Loading...',
  };
}

export function buildLocalMemberCardShellViewModel(
  isCardVisible: boolean,
  anchor: CardAnchor | null,
  member: any,
  summary: any
): MemberCardShellViewModel {
  const rawTier = summary?.tier ?? 'LOVER';
  const tierKey = String(rawTier).toUpperCase();
  const theme = CANDIDATE_TIER_THEMES[tierKey] ?? CANDIDATE_TIER_THEMES.LOVER;
  const availableLeaves = summary?.availableLeaves ?? 0;

  let joinDateText = '';
  if (member?.createdAt) {
    joinDateText = `Joined ${new Date(member.createdAt).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  }

  return {
    visible: isCardVisible,
    anchor: anchor ?? null,
    memberName: member?.displayName ?? 'Local Member',
    joinDateText,
    tierName: tierKey,
    theme,
    availableLeavesText: availableLeaves.toLocaleString('id-ID'),
    pendingLeavesText: '— / Not supported yet',
    pendingExplanationText:
      'Pending Leaves are unsupported locally until an authoritative ESB lifecycle exists.',
    showQrCode: false,
    qrValue: '',
    qrPlaceholderText: 'QR payload gated until security policy approved',
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/member-card-shell/member-card-shell-viewmodel.test.mjs`
Expected: PASS

---

### Task 2: Extract Pure Presentation (`src/presentation/memberCardShell/MemberCardShellView.tsx`)

**Files:**
- Create: `gongcha_app/src/presentation/memberCardShell/MemberCardShellView.tsx`

**Interfaces:**
- Consumes: `MemberCardShellViewModel`, `onClose: () => void`.
- Produces: `MemberCardShellView` React component.

- [ ] **Step 1: Write MemberCardShellView pure presentation component**

Extract pure layout, gesture, and animation logic from `MemberCardModal.tsx` into `src/presentation/memberCardShell/MemberCardShellView.tsx`.
Ensure it takes `viewModel: MemberCardShellViewModel` and `onClose: () => void` as props.
Ensure NO context or external services are imported.

---

### Task 3: Refactor Legacy Component and Create Local Wrapper Component

**Files:**
- Modify: `gongcha_app/src/components/MemberCardModal.tsx`
- Create: `gongcha_app/src/components/LocalMemberCardModal.tsx`

- [ ] **Step 1: Refactor `MemberCardModal.tsx` to use `MemberCardShellView` and `buildLegacyMemberCardShellViewModel`**
- [ ] **Step 2: Create `LocalMemberCardModal.tsx` using `buildLocalMemberCardShellViewModel` and `MemberCardShellView`**

---

### Task 4: Integration and Verification

**Files:**
- Test and verify with TypeScript and test suite.

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 2: Run all Member App tests**

Run: `node --import tsx --test tests/**/*.test.mjs`
Expected: PASS
