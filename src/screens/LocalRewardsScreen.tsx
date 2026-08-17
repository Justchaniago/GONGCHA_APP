import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  buildLocalRewardsViewModel,
  type RewardDisplayItem,
} from '../application/rewards/RewardsViewModel';
import { createLocalLoyaltySummaryController } from '../composition/loyaltySummary';
import { useMember } from '../context/MemberContext';
import { RewardsView } from '../presentation/rewards/RewardsView';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';

const MOCK_CATALOG = [
  {
    id: 'cat-0',
    title: 'Free Welcome Tea (Demo)',
    description: 'Gratis khusus testing lokal emulator (0 Leaves).',
    pointsRequired: 0,
  },
  {
    id: 'cat-1',
    title: 'Free Pearl Milk Tea',
    description: 'Tukar 500 Leaves dengan 1 Pearl Milk Tea reguler.',
    pointsRequired: 500,
  },
  {
    id: 'cat-2',
    title: 'Diskon 50% Milk Tea',
    description: 'Diskon 50% untuk varian topping apapun.',
    pointsRequired: 300,
  },
  {
    id: 'cat-3',
    title: 'Voucher Rp 20.000',
    description: 'Potongan Rp 20.000 untuk transaksi minimal Rp 50.000.',
    pointsRequired: 800,
  },
];

export default function LocalRewardsScreen() {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<LocalStackParamList>>();
  const { member } = useMember();
  const controller = useMemo(
    () => createLocalLoyaltySummaryController(),
    [],
  );
  const state = useLocalLoyaltySummary(controller, member?.uid ?? null);

  const [bonusLeaves] = useState(2000); // Override +2.000 Leaves untuk kemudahan pengujian emulator
  const [deductedLeaves, setDeductedLeaves] = useState(0);
  const [localVouchers, setLocalVouchers] = useState<any[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const baseLeaves = state.phase === 'ready' && state.summary ? state.summary.availableLeaves : 0;
    return {
      availableLeaves: Math.max(
        0,
        baseLeaves + bonusLeaves - deductedLeaves,
      ),
      pending: { leaves: 0, state: 'unsupported' as const },
    };
  }, [state, bonusLeaves, deductedLeaves]);

  const model = useMemo(() => {
    return buildLocalRewardsViewModel(
      summary,
      MOCK_CATALOG,
      localVouchers,
    );
  }, [summary, localVouchers]);

  const handleRedeem = (item: RewardDisplayItem) => {
    if (model.availableLeavesValue < item.pointsRequired) {
      Alert.alert(
        'Leaves Kurang',
        'Kumpulkan lebih banyak Leaves untuk menukar hadiah ini.',
      );
      return;
    }

    setRedeemingId(item.id);
    setTimeout(() => {
      setRedeemingId(null);
      setDeductedLeaves((prev) => prev + item.pointsRequired);

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
      Alert.alert(
        'Penukaran Berhasil 🎉',
        `Voucher \"${item.title}\" telah ditambahkan ke tab \"Voucher Saya\".`,
      );
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
