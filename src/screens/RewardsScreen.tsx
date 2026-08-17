import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useMember } from '../context/MemberContext';
import { useSecurity } from '../context/SecurityContext';
import { buildLocalRewardsViewModel } from '../application/rewards/RewardsViewModel';
import { RewardsView } from '../presentation/rewards/RewardsView';
import type { RewardDisplayItem } from '../application/rewards/RewardsViewModel';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { FastAPIRewardsRepository } from '../infrastructure/rewards/FastAPIRewardsRepository';
import { localLoyaltySummaryController } from '../composition/loyaltySummary';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsrequired: number;
  imageUrl?: string;
  category?: string;
  isActive?: boolean;
  isRedeemable?: boolean;
}

export default function RewardsScreen() {
  const navigation = useNavigation<Nav>();
  const { member } = useMember();
  const { ensureVerified } = useSecurity();

  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const { summary } = useLocalLoyaltySummary(localLoyaltySummaryController, member?.uid ?? null);

  const fetchRewards = useCallback(async () => {
    try {
      const data = await FastAPIRewardsRepository.listRewards();
      setRewards(data);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRewards(); }, [fetchRewards]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchRewards();
  }, [fetchRewards]);

  const handleRedeem = async (reward: RewardDisplayItem) => {
    const verified = await ensureVerified('redeem');
    if (!verified) return;

    Alert.alert(
      'Tukar Poin',
      `Tukar ${reward.pointsRequired} Leaves untuk \"${reward.title}\"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tukar',
          onPress: async () => {
            setRedeemingId(reward.id);
            try {
              const commandId = crypto.randomUUID();
              await FastAPIRewardsRepository.redeemReward(reward.id, commandId);
              Alert.alert('Berhasil!', 'Voucher telah ditambahkan ke My Vouchers.');
            } catch (error: any) {
              const msg =
                error?.message === 'insufficient_points'
                  ? 'Leaves tidak cukup untuk menukar reward ini.'
                  : 'Terjadi kesalahan saat menukar poin.';
              Alert.alert('Gagal', msg);
            } finally {
              setRedeemingId(null);
            }
          },
        },
      ],
    );
  };

  const model = useMemo(
    () => buildLocalRewardsViewModel(summary, rewards, member?.vouchers ?? []),
    [summary, rewards, member?.vouchers],
  );

  return (
    <RewardsView
      model={model}
      loading={loading}
      isRefreshing={isRefreshing}
      redeemingId={redeemingId}
      onRefresh={onRefresh}
      onRedeemReward={handleRedeem}
      onBack={() => navigation.goBack()}
    />
  );
}
