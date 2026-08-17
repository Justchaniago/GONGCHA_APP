import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  code?: string;
  title: string;
  description: string;
  pointsrequired: number;
  imageUrl?: string;
  category?: string;
  isActive?: boolean;
  isRedeemable?: boolean;
}

export default function RewardsScreen() {
  const { t } = useTranslation();
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
      const localized = data.map((r) => ({
        ...r,
        title: t(`catalog.rewards.${r.code}.title`, { defaultValue: r.title }),
        description: t(`catalog.rewards.${r.code}.description`, { defaultValue: r.description }),
      }));
      setRewards(localized);
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

    const rewardTitle = t('catalog.rewards.' + reward.code + '.title', { defaultValue: reward.title });

    Alert.alert(
      t('rewards.redeemConfirmTitle'),
      t('rewards.redeemConfirmMessage', { points: reward.pointsRequired, title: rewardTitle }),
      [
        { text: t('rewards.cancel'), style: 'cancel' },
        {
          text: t('rewards.redeem'),
          onPress: async () => {
            setRedeemingId(reward.id);
            try {
              const commandId = crypto.randomUUID();
              await FastAPIRewardsRepository.redeemReward(reward.id, commandId);
              Alert.alert(t('rewards.success'), t('rewards.successMessage'));
            } catch (error: any) {
              const msg =
                error?.message === 'insufficient_points'
                  ? t('rewards.insufficientPoints')
                  : t('rewards.redeemError');
              Alert.alert(t('rewards.failed'), msg);
            } finally {
              setRedeemingId(null);
            }
          },
        },
      ],
    );
  };

  const model = useMemo(
    () => buildLocalRewardsViewModel(t, summary, rewards, member?.vouchers ?? []),
    [t, summary, rewards, member?.vouchers],
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
