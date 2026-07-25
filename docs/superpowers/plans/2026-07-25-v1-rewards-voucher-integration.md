# V1 Rewards, Voucher & Catalog Integration (Batch 1 / Stage 6A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract pure V1 Rewards & Voucher presentation, view model presenters, and local FastAPI harness for Batch 1 (Stage 6A) while preserving 100% of V1 layout, tab switching, animations, and voucher detail presentation.

**Architecture:** Refactor `RewardsScreen.tsx` into a pure V1 presentation component (`RewardsView.tsx`), a voucher modal (`VoucherDetailModal.tsx`), view model presenters (`RewardsViewModel.ts`), and separate wrappers for legacy compatibility (`RewardsScreen.tsx`) and local FastAPI harness (`LocalRewardsScreen.tsx`).

**Tech Stack:** React Native, TypeScript, Lucide Icons, Expo Linear Gradient, React Native QRCode SVG, Node.js Test Runner.

## Global Constraints

- **Preserve V1 UX**: Retain V1 layout, header scroll animations, tab switching (*Katalog Hadiah* vs *Voucher Saya*), and voucher detail modal.
- **Forbidden Imports in Presentation**: `RewardsView.tsx` and `VoucherDetailModal.tsx` must contain ZERO imports of Firebase, Firestore, Storage, AuthService, or backend DTOs.
- **Data Isolation**: Never read two data authorities in one composition wrapper.
- **Type Safety**: `npx tsc --noEmit` must pass with 0 errors.

---

### Task 1: Create Application View Models & Presenters (`RewardsViewModel.ts`)

**Files:**
- Create: `src/application/rewards/RewardsViewModel.ts`
- Test: `tests/rewards/rewards-viewmodel.test.mjs`

**Interfaces:**
- Produces: `RewardDisplayItem`, `VoucherDisplayItem`, `RewardsViewModel`, `buildLegacyRewardsViewModel`, `buildLocalRewardsViewModel`

- [ ] **Step 1: Write the failing view model characterization test**

```javascript
import test from 'node.test';
import assert from 'node:assert/strict';

import {
  buildLegacyRewardsViewModel,
  buildLocalRewardsViewModel,
} from '../../src/application/rewards/RewardsViewModel.ts';

test('buildLegacyRewardsViewModel formats legacy rewards correctly', () => {
  const member = { currentPoints: 1000, pendingPoints: 200 };
  const rewards = [{ id: '1', title: 'Free Pearl Milk Tea', pointsrequired: 500, description: 'Tasty' }];
  const vouchers = [{ id: 'v1', code: 'GC-123', title: 'Free Pearl', status: 'active', expiryDate: '2026-12-31' }];

  const model = buildLegacyRewardsViewModel(member, rewards, vouchers);
  assert.equal(model.availableLeavesLabel, '1.000 Leaves');
  assert.equal(model.catalogItems[0].canAfford, true);
  assert.equal(model.catalogItems[0].actionLabel, 'Tukar');
});

test('buildLocalRewardsViewModel formats FastAPI summary correctly', () => {
  const member = { fullName: 'Local User' };
  const summary = { leaves_balance: 400, pending_leaves: 0 };
  const catalog = [{ id: 'c1', title: 'Diskon 50%', pointsRequired: 500 }];
  const vouchers = [];

  const model = buildLocalRewardsViewModel(member, summary, catalog, vouchers);
  assert.equal(model.availableLeavesLabel, '400 Leaves');
  assert.equal(model.catalogItems[0].canAfford, false);
  assert.equal(model.catalogItems[0].actionLabel, '100 Leaves Lagi');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rewards/rewards-viewmodel.test.mjs`  
Expected: FAIL with "Cannot find module RewardsViewModel.ts"

- [ ] **Step 3: Write implementation for `RewardsViewModel.ts`**

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
  availableLeavesValue: number;
  catalogItems: RewardDisplayItem[];
  activeVouchers: VoucherDisplayItem[];
  historyVouchers: VoucherDisplayItem[];
}

export function buildLegacyRewardsViewModel(
  member: any,
  rewards: any[],
  vouchers: any[],
): RewardsViewModel {
  const points = member?.currentPoints ?? member?.points ?? 0;
  const pending = member?.pendingPoints ?? 0;

  const catalogItems: RewardDisplayItem[] = (rewards || []).map((r) => {
    const required = r.pointsrequired ?? r.pointsRequired ?? 0;
    const canAfford = points >= required;
    const diff = required - points;
    return {
      id: r.id,
      title: r.title || 'Reward Gong Cha',
      description: r.description || '',
      pointsRequired: required,
      pointsRequiredLabel: `${required.toLocaleString('id-ID')} Leaves`,
      imageUrl: r.imageUrl,
      category: r.category,
      canAfford,
      actionLabel: canAfford ? 'Tukar' : `${diff.toLocaleString('id-ID')} Leaves Lagi`,
    };
  });

  const activeVouchers: VoucherDisplayItem[] = [];
  const historyVouchers: VoucherDisplayItem[] = [];

  (vouchers || []).forEach((v) => {
    const item: VoucherDisplayItem = {
      id: v.id || v.code,
      code: v.code || 'GC-VOUCHER',
      title: v.title || v.voucherTitle || 'Voucher Gong Cha',
      description: v.description || 'Gunakan saat pemesanan.',
      discountType: v.discountType || 'fixed',
      value: v.value || 0,
      formattedExpiry: v.expiryDate || v.formattedExpiry || 'Berlaku s/d 31 Des 2026',
      status: v.status === 'used' ? 'used' : v.status === 'expired' ? 'expired' : 'active',
      qrPayload: v.code || 'GC-VOUCHER',
    };
    if (item.status === 'active') {
      activeVouchers.push(item);
    } else {
      historyVouchers.push(item);
    }
  });

  return {
    availableLeavesLabel: `${points.toLocaleString('id-ID')} Leaves`,
    pendingLeavesLabel: `${pending.toLocaleString('id-ID')} Pending`,
    availableLeavesValue: points,
    catalogItems,
    activeVouchers,
    historyVouchers,
  };
}

export function buildLocalRewardsViewModel(
  member: any,
  summary: any,
  catalog: any[],
  vouchers: any[],
): RewardsViewModel {
  const points = summary?.leaves_balance ?? 0;
  const pending = summary?.pending_leaves ?? 0;

  const catalogItems: RewardDisplayItem[] = (catalog || []).map((c) => {
    const required = c.pointsRequired ?? c.pointsrequired ?? 0;
    const canAfford = points >= required;
    const diff = required - points;
    return {
      id: c.id,
      title: c.title,
      description: c.description || '',
      pointsRequired: required,
      pointsRequiredLabel: `${required.toLocaleString('id-ID')} Leaves`,
      imageUrl: c.imageUrl,
      category: c.category,
      canAfford,
      actionLabel: canAfford ? 'Tukar' : `${diff.toLocaleString('id-ID')} Leaves Lagi`,
    };
  });

  const activeVouchers: VoucherDisplayItem[] = [];
  const historyVouchers: VoucherDisplayItem[] = [];

  (vouchers || []).forEach((v) => {
    const item: VoucherDisplayItem = {
      id: v.id,
      code: v.code,
      title: v.title,
      description: v.description || 'Voucher promo Gong Cha.',
      discountType: v.discountType || 'fixed',
      value: v.value || 0,
      formattedExpiry: v.formattedExpiry || 'Berlaku s/d 31 Des 2026',
      status: v.status || 'active',
      qrPayload: v.code,
    };
    if (item.status === 'active') {
      activeVouchers.push(item);
    } else {
      historyVouchers.push(item);
    }
  });

  return {
    availableLeavesLabel: `${points.toLocaleString('id-ID')} Leaves`,
    pendingLeavesLabel: `${pending.toLocaleString('id-ID')} Pending`,
    availableLeavesValue: points,
    catalogItems,
    activeVouchers,
    historyVouchers,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rewards/rewards-viewmodel.test.mjs`  
Expected: PASS (2 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/application/rewards/RewardsViewModel.ts tests/rewards/rewards-viewmodel.test.mjs
git commit -m "feat(rewards): add RewardsViewModel and presenters (Batch 1)"
```

---

### Task 2: Extract Pure Presentation Components (`VoucherDetailModal.tsx` & `RewardsView.tsx`)

**Files:**
- Create: `src/presentation/rewards/VoucherDetailModal.tsx`
- Create: `src/presentation/rewards/RewardsView.tsx`

- [ ] **Step 1: Create `VoucherDetailModal.tsx`**

Extract the voucher detail modal with barcode/QR code SVG display:

```typescript
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X, Ticket } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import type { VoucherDisplayItem } from '../../application/rewards/RewardsViewModel';

interface VoucherDetailModalProps {
  visible: boolean;
  voucher: VoucherDisplayItem | null;
  onClose: () => void;
}

export function VoucherDetailModal({ visible, voucher, onClose }: VoucherDetailModalProps) {
  if (!voucher) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={styles.iconBg}>
              <Ticket size={24} color="#C8102E" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{voucher.title}</Text>
              <Text style={styles.expiry}>{voucher.formattedExpiry}</Text>
            </View>
          </View>

          <Text style={styles.desc}>{voucher.description}</Text>

          <View style={styles.qrContainer}>
            <QRCode value={voucher.qrPayload} size={150} color="#1A1A1A" backgroundColor="#FFFFFF" />
            <Text style={styles.codeText}>{voucher.code}</Text>
            <Text style={styles.scanHint}>Tunjukkan QR code ini ke kasir Gong Cha</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  expiry: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  desc: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 20 },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 20,
  },
  codeText: { fontSize: 16, fontWeight: '800', color: '#C8102E', marginTop: 12, letterSpacing: 1.5 },
  scanHint: { fontSize: 12, color: '#6B7280', marginTop: 6 },
});
```

- [ ] **Step 2: Create `RewardsView.tsx`**

Pure presentation component preserving tab switching, card list, scroll animations, and modal triggers:

```typescript
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gift, Ticket, Trophy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RewardDisplayItem, RewardsViewModel, VoucherDisplayItem } from '../../application/rewards/RewardsViewModel';
import DecorativeBackground from '../../components/DecorativeBackground';
import ScreenFadeTransition from '../../components/ScreenFadeTransition';
import { VoucherDetailModal } from './VoucherDetailModal';

const AnimatedFlatList = Animated.FlatList as typeof Animated.FlatList;

export interface RewardsViewProps {
  model: RewardsViewModel;
  loading: boolean;
  isRefreshing: boolean;
  redeemingId: string | null;
  onRefresh: () => void;
  onRedeemReward: (item: RewardDisplayItem) => void;
  onBack?: () => void;
}

export function RewardsView({
  model,
  loading,
  isRefreshing,
  redeemingId,
  onRefresh,
  onRedeemReward,
}: RewardsViewProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'catalog' | 'vouchers'>('catalog');
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDisplayItem | null>(null);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#C8102E" />
        <Text style={styles.loadingText}>Memuat Katalog Hadiah...</Text>
      </View>
    );
  }

  return (
    <ScreenFadeTransition style={styles.container}>
      <DecorativeBackground />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Rewards & Voucher</Text>
        <View style={styles.leavesPill}>
          <Gift size={16} color="#C8102E" />
          <Text style={styles.leavesPillText}>{model.availableLeavesLabel}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'catalog' && styles.activeTab]}
          onPress={() => setActiveTab('catalog')}
        >
          <Trophy size={18} color={activeTab === 'catalog' ? '#C8102E' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'catalog' && styles.activeTabText]}>
            Katalog Hadiah
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vouchers' && styles.activeTab]}
          onPress={() => setActiveTab('vouchers')}
        >
          <Ticket size={18} color={activeTab === 'vouchers' ? '#C8102E' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'vouchers' && styles.activeTabText]}>
            Voucher Saya ({model.activeVouchers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'catalog' ? (
        <AnimatedFlatList
          data={model.catalogItems}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#C8102E']} />}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.rewardCard}>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardTitle}>{item.title}</Text>
                <Text style={styles.rewardDesc}>{item.description}</Text>
                <Text style={styles.rewardPoints}>{item.pointsRequiredLabel}</Text>
              </View>
              <TouchableOpacity
                style={[styles.redeemBtn, !item.canAfford && styles.disabledBtn]}
                disabled={!item.canAfford || redeemingId === item.id}
                onPress={() => onRedeemReward(item)}
              >
                {redeemingId === item.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.redeemBtnText}>{item.actionLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <AnimatedFlatList
          data={model.activeVouchers}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity style={styles.voucherCard} onPress={() => setSelectedVoucher(item)}>
              <View style={styles.voucherInfo}>
                <Text style={styles.voucherTitle}>{item.title}</Text>
                <Text style={styles.voucherExpiry}>{item.formattedExpiry}</Text>
              </View>
              <Text style={styles.useText}>Gunakan ›</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <VoucherDetailModal
        visible={!!selectedVoucher}
        voucher={selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
      />
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFDFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#6B7280', marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  leavesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8EC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  leavesPillText: { color: '#C8102E', fontSize: 13, fontWeight: '800' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginRight: 24,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#C8102E' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  activeTabText: { color: '#C8102E' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  rewardInfo: { flex: 1, paddingRight: 12 },
  rewardTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  rewardDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  rewardPoints: { fontSize: 13, fontWeight: '800', color: '#C8102E', marginTop: 6 },
  redeemBtn: {
    backgroundColor: '#C8102E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  disabledBtn: { backgroundColor: '#9CA3AF' },
  redeemBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  voucherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  voucherInfo: { flex: 1 },
  voucherTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  voucherExpiry: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  useText: { fontSize: 13, fontWeight: '800', color: '#C8102E' },
});
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`  
Expected: PASS (0 errors)

- [ ] **Step 4: Commit**

```bash
git add src/presentation/rewards/VoucherDetailModal.tsx src/presentation/rewards/RewardsView.tsx
git commit -m "feat(rewards): extract RewardsView and VoucherDetailModal (Batch 1)"
```

---

### Task 3: Refactor Legacy Wrapper (`RewardsScreen.tsx`)

**Files:**
- Modify: `src/screens/RewardsScreen.tsx`

- [ ] **Step 1: Refactor `RewardsScreen.tsx` to delegate to `RewardsView.tsx`**

Update `RewardsScreen.tsx` so it fetches Firestore catalog and user vouchers, passes them to `buildLegacyRewardsViewModel`, and renders `<RewardsView />`.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`  
Expected: PASS (0 errors)

- [ ] **Step 3: Commit**

```bash
git add src/screens/RewardsScreen.tsx
git commit -m "refactor(rewards): update legacy RewardsScreen to use RewardsView (Batch 1)"
```

---

### Task 4: Create Local FastAPI Harness Wrapper (`LocalRewardsScreen.tsx`)

**Files:**
- Create: `src/screens/LocalRewardsScreen.tsx`
- Modify: `src/navigation/LocalAppNavigator.tsx`
- Modify: `src/screens/LocalDashboardScreen.tsx`

- [ ] **Step 1: Create `LocalRewardsScreen.tsx`**

```typescript
import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { buildLocalRewardsViewModel, type RewardDisplayItem } from '../application/rewards/RewardsViewModel';
import { createLocalLoyaltySummaryController } from '../composition/loyaltySummary';
import { useMember } from '../context/MemberContext';
import { RewardsView } from '../presentation/rewards/RewardsView';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';

const MOCK_CATALOG = [
  { id: 'cat-1', title: 'Free Pearl Milk Tea', description: 'Tukar 500 Leaves dengan 1 Pearl Milk Tea reguler.', pointsRequired: 500 },
  { id: 'cat-2', title: 'Diskon 50% Milk Tea', description: 'Diskon 50% untuk varian topping apapun.', pointsRequired: 300 },
  { id: 'cat-3', title: 'Voucher Rp 20.000', description: 'Potongan Rp 20.000 untuk transaksi minimal Rp 50.000.', pointsRequired: 800 },
];

export default function LocalRewardsScreen() {
  const navigation = useNavigation();
  const { member } = useMember();
  const controller = useMemo(() => createLocalLoyaltySummaryController(), []);
  const state = useLocalLoyaltySummary(controller, member?.uid ?? null);
  const [localVouchers, setLocalVouchers] = useState<any[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const model = useMemo(
    () =>
      buildLocalRewardsViewModel(
        member,
        state.phase === 'ready' ? state.summary : null,
        MOCK_CATALOG,
        localVouchers,
      ),
    [member, state, localVouchers],
  );

  const handleRedeem = (item: RewardDisplayItem) => {
    if (model.availableLeavesValue < item.pointsRequired) {
      Alert.alert('Leaves Kurang', 'Kumpulkan lebih banyak Leaves untuk menukar hadiah ini.');
      return;
    }

    setRedeemingId(item.id);
    setTimeout(() => {
      setRedeemingId(null);
      const newVoucher = {
        id: `vouch-${Date.now()}`,
        code: `GC-LOCAL-${Math.floor(1000 + Math.random() * 9000)}`,
        title: item.title,
        description: item.description,
        discountType: 'fixed',
        value: item.pointsRequired,
        formattedExpiry: 'Berlaku s/d 31 Des 2026',
        status: 'active',
      };
      setLocalVouchers((prev) => [newVoucher, ...prev]);
      Alert.alert('Penukaran Berhasil 🎉', `Voucher "${item.title}" telah ditambahkan ke tab "Voucher Saya".`);
    }, 800);
  };

  return (
    <RewardsView
      model={model}
      loading={state.phase === 'loading' || state.phase === 'idle'}
      isRefreshing={state.phase === 'ready' && state.refreshing}
      redeemingId={redeemingId}
      onRefresh={() => void controller.refresh()}
      onRedeemReward={handleRedeem}
      onBack={() => navigation.goBack()}
    />
  );
}
```

- [ ] **Step 2: Add `LocalRewards` route to `LocalAppNavigator.tsx`**

Add `LocalRewards` to `LocalStackParamList` and register `LocalRewardsScreen`.

- [ ] **Step 3: Add "🎁 Buka Rewards & Voucher V1" button in `LocalDashboardScreen.tsx`**

```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Buka rewards lokal"
  style={styles.rewardsButton}
  onPress={() => navigation.navigate('LocalRewards')}
>
  <Text style={styles.rewardsButtonText}>🎁 Buka Rewards & Voucher V1</Text>
</TouchableOpacity>
```

- [ ] **Step 4: Run TypeScript check & Node viewmodel tests**

Run: `npx tsc --noEmit && node --test tests/rewards/rewards-viewmodel.test.mjs`  
Expected: PASS (0 errors)

- [ ] **Step 5: Commit**

```bash
git add src/screens/LocalRewardsScreen.tsx src/navigation/LocalAppNavigator.tsx src/screens/LocalDashboardScreen.tsx
git commit -m "feat(rewards): wire LocalRewardsScreen harness and dashboard trigger (Batch 1)"
```

---

### Task 5: Full Verification & Validation

**Files:**
- All touched files in `gongcha_app`

- [ ] **Step 1: Run full Member App characterization test suite**

Run: `node --test tests/**/*.test.mjs`  
Expected: PASS (104+ tests pass)

- [ ] **Step 2: Run backend local verifier**

Run: `./scripts/verify-local.sh` in `gongcha-backend`  
Expected: PASS (204+ tests pass)

- [ ] **Step 3: Verify clean git status**

Run: `git status`  
Expected: Clean working tree
