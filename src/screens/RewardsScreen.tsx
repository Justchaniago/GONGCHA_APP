import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { firestoreDb as db } from '../config/firebase';
import { useMember } from '../context/MemberContext';
import { useSecurity } from '../context/SecurityContext';
import { UserService } from '../services/UserService';
import { buildLegacyRewardsViewModel } from '../application/rewards/RewardsViewModel';
import { RewardsView } from '../presentation/rewards/RewardsView';
import type { RewardDisplayItem } from '../application/rewards/RewardsViewModel';
import type { RootStackParamList } from '../navigation/AppNavigator';

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
  updatedAt?: any;
}

const CACHE_KEY = '@gongcha_rewards_data';
const CACHE_SYNC_TIME_KEY = '@gongcha_rewards_sync_time';

export default function RewardsScreen() {
  const navigation = useNavigation<Nav>();
  const { member } = useMember();
  const { ensureVerified } = useSecurity();

  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const availablePoints = member?.currentPoints ?? member?.points ?? 0;
  const pendingPoints = member?.pendingPoints ?? 0;

  const fetchRewardsData = useCallback(async (forceFull = false) => {
    try {
      const cachedDataStr = await AsyncStorage.getItem(CACHE_KEY);
      let localRewards: RewardItem[] = cachedDataStr ? JSON.parse(cachedDataStr) : [];
      const lastSyncStr = await AsyncStorage.getItem(CACHE_SYNC_TIME_KEY);
      const lastSyncTime = forceFull ? 0 : (lastSyncStr ? parseInt(lastSyncStr, 10) : 0);
      const lastSyncDate = new Date(lastSyncTime);

      const q = query(collection(db, 'rewards_catalog'), where('updatedAt', '>', lastSyncDate));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const updatedItems: RewardItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RewardItem));
        const localMap = new Map(localRewards.map(r => [r.id, r]));
        updatedItems.forEach(item => localMap.set(item.id, item));
        localRewards = Array.from(localMap.values());
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(localRewards));
      }

      await AsyncStorage.setItem(CACHE_SYNC_TIME_KEY, Date.now().toString());
      // Filter: hanya tampilkan isActive + isRedeemable true di katalog
      const activeRewards = localRewards
        .filter(r => r.isActive !== false && r.isRedeemable !== false)
        .sort((a, b) => (a.pointsrequired ?? 0) - (b.pointsrequired ?? 0));
      setRewards(activeRewards);
    } catch (error) {
      console.error('Error Sync Rewards:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRewardsData(true);
  }, [fetchRewardsData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchRewardsData(false);
  };

  const handleRedeem = async (reward: RewardDisplayItem) => {
    if (availablePoints < reward.pointsRequired) {
      Alert.alert(
        'Poin tersedia belum cukup',
        pendingPoints > 0
          ? `Kamu punya ${availablePoints} poin tersedia dan ${pendingPoints} poin pending. Hanya poin tersedia yang bisa dipakai untuk redeem.`
          : 'Kamu butuh lebih banyak poin tersedia untuk menukar reward ini.',
      );
      return;
    }

    const allowed = await ensureVerified('redeem');
    if (!allowed) {
      return;
    }

    Alert.alert('Tukar Reward?', `Gunakan ${reward.pointsRequired} poin untuk "${reward.title}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Tukar',
        onPress: async () => {
          setRedeemingId(reward.id);
          try {
            await UserService.redeemVoucher(reward);
            Alert.alert('Berhasil!', 'Voucher telah ditambahkan ke My Vouchers.');
          } catch (error) {
            Alert.alert('Gagal', 'Terjadi kesalahan saat menukar poin.');
          } finally {
            setRedeemingId(null);
          }
        }
      }
    ]);
  };

  const model = useMemo(() => {
    return buildLegacyRewardsViewModel(member, rewards, member?.vouchers ?? []);
  }, [member, rewards]);

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
