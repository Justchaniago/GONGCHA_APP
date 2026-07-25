# Design Spec — V1 Rewards, Voucher & Catalog Integration (Batch 1 / Stage 6A)

**Date**: 2026-07-25  
**Target Milestone**: Batch 1 / Stage 6A (Shared V1 Rewards & Voucher Integration)  
**Status**: APPROVED by Human Supervisor  

---

## 1. Executive Summary & Goals

The objective of Batch 1 (Stage 6A) is to refactor the V1 `RewardsScreen` component according to the approved clean architecture rules (D-119..D-122):
1. **Preserve V1 UI/UX Parity**: Maintain 100% of V1 layout, tab switching (*Katalog Hadiah* vs *Voucher Saya*), header scroll animations, reward card styles, redemption loading feedback, and voucher detail modal presentation.
2. **Remove Direct Firestore Coupling**: Eliminate direct `collection(db, 'rewards_catalog')` queries and `UserService.redeemReward` calls from the UI layer.
3. **Extract Pure Presentation**: Create `RewardsView.tsx` with plain display props and callbacks without any Firestore, Firebase, or backend DTO imports.
4. **Create Application View Model**: Build `RewardsViewModel.ts` to provide pure display models and presenters for both legacy compatibility and local FastAPI harness.
5. **Implement Local FastAPI Harness**: Create `LocalRewardsScreen.tsx` connected to FastAPI local endpoints for catalog browsing, mock redemption claim, and voucher wallet management.

---

## 2. Architecture & File Decomposition

```text
gongcha_app/src/
  ├── presentation/rewards/
  │     ├── RewardsView.tsx           # Pure V1 presentation component
  │     └── VoucherDetailModal.tsx    # Pure V1 voucher detail modal with QR SVG
  ├── application/rewards/
  │     └── RewardsViewModel.ts       # Pure display models, presenters & claim logic
  ├── screens/
  │     ├── RewardsScreen.tsx         # Legacy compatibility wrapper (rollback safe)
  │     └── LocalRewardsScreen.tsx    # Local FastAPI harness wrapper
  └── navigation/
        └── LocalAppNavigator.tsx     # Route registration for LocalRewards
```

---

## 3. Data Flow & Interface Specifications

### A. Pure Presentation Props (`RewardsViewProps`)

```typescript
export interface RewardDisplayItem {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  pointsRequiredLabel: string;
  imageUrl?: string;
  category?: string;
  canAfford: boolean;
  actionLabel: string;
}

export interface VoucherDisplayItem {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: string;
  value: number;
  formattedExpiry: string;
  status: 'active' | 'used' | 'expired';
  qrPayload: string;
}

export interface RewardsViewModel {
  availableLeavesLabel: string;
  pendingLeavesLabel: string;
  catalogItems: RewardDisplayItem[];
  activeVouchers: VoucherDisplayItem[];
  historyVouchers: VoucherDisplayItem[];
}
```

### B. Presenters in `RewardsViewModel.ts`

- `buildLegacyRewardsViewModel(member, rewards, userVouchers)`: Legacy presenter preserving existing Firestore data structures.
- `buildLocalRewardsViewModel(member, catalog, userVouchers)`: Local presenter formatting FastAPI loyalty summary and local mock vouchers into `RewardsViewModel`.

---

## 4. Local FastAPI Endpoints & Mock Claims

FastAPI backend or local harness controller handles three operations:
1. `GET /api/v1/rewards/catalog`: Returns static Gong Cha rewards catalog (e.g. *Free Pearl Milk Tea*, *Diskon 50% Milk Tea*, *Voucher Rp 20.000*).
2. `POST /api/v1/rewards/redeem`: Checks member's Leaves balance. If sufficient, deducts required Leaves and appends a new active `UserVoucher` (e.g. `GC-FREE-PEARL-8899`) to the member's active vouchers list.
3. `GET /api/v1/rewards/vouchers`: Returns the member's active and history vouchers.

---

## 5. Verification & Acceptance Criteria

1. **TypeScript Check**: `npx tsc --noEmit` must pass with 0 errors.
2. **Unit / Characterization Tests**: Focused viewmodel tests in `tests/rewards/rewards-viewmodel.test.mjs`.
3. **Full Client Test Suite**: All 104+ Member App characterization tests pass.
4. **Backend Verifier**: `./scripts/verify-local.sh` passes 204+ tests.
5. **Human Emulator QA/QC**:
   - Tab switching between *Katalog Hadiah* & *Voucher Saya* is smooth.
   - Tapping "Tukar" deducts Leaves and generates a new active voucher.
   - Tapping an active voucher opens the detail modal displaying the code and QR SVG.
