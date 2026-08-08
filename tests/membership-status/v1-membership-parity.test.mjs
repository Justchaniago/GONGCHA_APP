import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildLegacyMembershipStatusViewModel,
  buildLocalMembershipStatusViewModel,
} from '../../src/application/membershipStatus/MembershipStatusViewModel.ts';

function legacyMember(overrides = {}) {
  return {
    uid: 'member-1',
    fullName: 'Test Member',
    email: 'member@example.com',
    phoneNumber: '08123456789',
    points: 125,
    currentPoints: 125,
    pendingPoints: 25,
    lifetimePoints: 700,
    tierXp: 500,
    tier: 'Silver',
    xpHistory: [],
    ...overrides,
  };
}

function localSummary(overrides = {}) {
  return {
    availableLeaves: 75,
    qualifyingLeaves: 100,
    pending: { state: 'unsupported', leaves: null },
    tier: {
      code: 'MASTER',
      displayName: 'Gong cha Master',
      currentThreshold: 100,
      nextCode: 'AMBASSADOR',
      nextDisplayName: 'Gong cha Ambassador',
      nextThreshold: 800,
      remaining: 700,
      progressPercent: 0,
    },
    policyVersion: 'gongcha-tier-candidate-v1',
    ...overrides,
  };
}

test('legacy presenter preserves Silver membership values and copy', () => {
  const model = buildLegacyMembershipStatusViewModel(legacyMember());
  assert.equal(model.theme, 'legacy-silver');
  assert.equal(model.tierDisplayName, 'Silver');
  assert.equal(model.totalLabel, 'Total XP');
  assert.equal(model.totalValueLabel, '500');
  assert.equal(model.progressPercent, 10);
  assert.equal(model.progressCurrentLabel, '500 XP');
  assert.equal(model.progressTargetLabel, '5.000 XP');
  assert.deepEqual(model.progressMessage, {
    emphasis: '4.500 XP',
    suffix: ' lagi untuk mencapai Gold',
    terminal: false,
  });
  assert.deepEqual(
    model.stats.map(({ label, valueLabel }) => [label, valueLabel]),
    [
      ['Poin Tersedia', '125'],
      ['Poin Pending', '25'],
      ['Lifetime', '700'],
    ],
  );
  assert.equal(model.multiplierLabel, '1× earn');
  assert.equal(model.benefits.length, 3);
  assert.equal(model.activity.kind, 'items');
});

test('legacy presenter preserves top-tier and normalized history behavior', () => {
  const now = Date.parse('2026-07-24T12:00:00Z');
  const model = buildLegacyMembershipStatusViewModel(
    legacyMember({
      tier: 'Platinum',
      tierXp: 16000,
      xpHistory: [
        {
          id: 'older',
          date: '2026-07-20T12:00:00Z',
          amount: 10,
          type: 'earn',
          status: 'verified',
          location: 'Store A',
        },
        {
          id: 'newer',
          date: '2026-07-24T11:30:00Z',
          amount: 5,
          type: 'redeem',
          context: 'Tukar reward',
        },
      ],
    }),
    now,
  );
  assert.equal(model.theme, 'legacy-platinum');
  assert.equal(model.progressPercent, 100);
  assert.equal(model.progressMessage.terminal, true);
  assert.equal(model.nextTierHint, null);
  assert.deepEqual(
    model.activity.items.map((item) => [
      item.id,
      item.status,
      item.amountLabel,
    ]),
    [
      ['newer', 'redeem', '−5 XP'],
      ['older', 'verified', '+10 XP'],
    ],
  );
});

test('local presenter passes backend-owned Leaves and tier values unchanged', () => {
  const model = buildLocalMembershipStatusViewModel(localSummary());
  assert.equal(model.theme, 'candidate-master');
  assert.equal(model.tierDisplayName, 'Gong cha Master');
  assert.equal(model.totalValueLabel, '100');
  assert.equal(model.progressPercent, 0);
  assert.equal(model.progressCurrentLabel, '100 Leaves');
  assert.equal(model.progressTargetLabel, '800 Leaves');
  assert.deepEqual(model.progressMessage, {
    emphasis: '700 Leaves',
    suffix: ' lagi untuk mencapai Gong cha Ambassador',
    terminal: false,
  });
  assert.deepEqual(
    model.stats.map(({ label, valueLabel }) => [label, valueLabel]),
    [
      ['Leaves Tersedia', '75'],
      ['Leaves Kualifikasi', '100'],
      ['Leaves Pending', '0'],
    ],
  );
  assert.equal(model.benefits.length, 3);
  assert.equal(model.activity.kind, 'items');
});

test('local presenter preserves terminal Legend contract', () => {
  const model = buildLocalMembershipStatusViewModel(
    localSummary({
      availableLeaves: 1200,
      qualifyingLeaves: 1600,
      tier: {
        code: 'LEGEND',
        displayName: 'Gong cha Legend',
        currentThreshold: 1600,
        nextCode: null,
        nextDisplayName: null,
        nextThreshold: null,
        remaining: 0,
        progressPercent: 100,
      },
    }),
  );
  assert.equal(model.theme, 'candidate-legend');
  assert.equal(model.progressPercent, 100);
  assert.equal(model.progressTargetLabel, '1.600 Leaves');
  assert.equal(model.progressMessage.terminal, true);
});

test('legacy and local wrappers use one pure V1 presentation view', () => {
  const legacy = readFileSync(
    'src/screens/MembershipStatusScreen.tsx',
    'utf8',
  );
  const local = readFileSync(
    'src/screens/LocalMembershipStatusScreen.tsx',
    'utf8',
  );
  const shared = readFileSync(
    'src/presentation/membershipStatus/MembershipStatusView.tsx',
    'utf8',
  );
  const presenter = readFileSync(
    'src/application/membershipStatus/MembershipStatusViewModel.ts',
    'utf8',
  );

  assert.equal(legacy.includes('<MembershipStatusView'), true);
  assert.equal(
    legacy.includes('buildLegacyMembershipStatusViewModel'),
    true,
  );
  assert.equal(local.includes('<MembershipStatusView'), true);
  assert.equal(
    local.includes('buildLocalMembershipStatusViewModel'),
    true,
  );
  assert.equal(local.includes('useLocalLoyaltySummary'), true);

  for (const forbidden of [
    'useMember',
    'firebase',
    'Firestore',
    'Repository',
    'Service',
    'TIER_LIMITS',
    'tierXp /',
    'target -',
  ]) {
    assert.equal(shared.includes(forbidden), false, `shared contains ${forbidden}`);
  }
  for (const forbidden of [
    'firebase',
    'Silver',
    'Gold',
    'Platinum',
    'tierXp',
    'points',
  ]) {
    assert.equal(local.includes(forbidden), false, `local contains ${forbidden}`);
  }

  for (const evidence of [
    'duration: 300',
    'friction: 9',
    'tension: 72',
    'borderRadius: 24',
    'slideAnim',
    'RefreshControl',
    "require('../../../assets/images/logo1.png')",
  ]) {
    assert.equal(shared.includes(evidence), true, `missing ${evidence}`);
  }

  for (const theme of [
    "'candidate-lover'",
    "'candidate-master'",
    "'candidate-ambassador'",
    "'candidate-legend'",
  ]) {
    assert.equal(presenter.includes(theme), true, `missing ${theme}`);
  }
  assert.equal(presenter.includes('FAMILY'), true);
});
