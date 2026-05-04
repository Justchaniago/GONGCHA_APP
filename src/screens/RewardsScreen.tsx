import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, useWindowDimensions, Modal, Pressable, Animated
} from 'react-native';
import { Trophy, Gift, Star, Ticket, X, ChevronRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestoreDb as db } from '../config/firebase';

import { useMember } from '../context/MemberContext';
import { useSecurity } from '../context/SecurityContext';
import { UserService } from '../services/UserService';
import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import { UserVoucher } from '../types/types';

// --- TYPES ---
interface RewardItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
  isRedeemable?: boolean;
  updatedAt?: any;
}

type RewardsTab = 'catalog' | 'vouchers';

const CACHE_KEY = '@gongcha_rewards_data';
const CACHE_SYNC_TIME_KEY = '@gongcha_rewards_sync_time';

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { member } = useMember(); // refreshMember dihapus karena update otomatis via snapshot
  const { ensureVerified } = useSecurity();
  
  const [activeTab, setActiveTab] = useState<RewardsTab>('catalog');
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // Modal State
  const [selectedVoucher, setSelectedVoucher] = useState<UserVoucher | null>(null);
  const [voucherQrPayload, setVoucherQrPayload] = useState<string>('');
  const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
  const [useVoucherLoading, setUseVoucherLoading] = useState(false);
  const availablePoints = member?.currentPoints ?? member?.points ?? 0;
  const pendingPoints = member?.pendingPoints ?? 0;

  // 🚀 FUNGSI DELTA SYNC UNTUK KATALOG

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
      // Filter: hanya tampilkan isRedeemable true di katalog
      const activeRewards = localRewards
        .filter(r => r.isAvailable !== false && r.isRedeemable !== false)
        .sort((a, b) => a.pointsCost - b.pointsCost);
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

  // --- LOGIKA REDEEM ---
  const handleRedeem = async (reward: RewardItem) => {
    if (availablePoints < reward.pointsCost) {
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

    Alert.alert('Tukar Reward?', `Gunakan ${reward.pointsCost} poin untuk "${reward.title}"?`, [
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

  // --- LOGIKA PAKAI VOUCHER ---
  const handleUseVoucher = async (voucher: UserVoucher) => {
    if (voucher.isUsed) return;

    const allowed = await ensureVerified('voucher');
    if (!allowed) {
      return;
    }

    try {
      setUseVoucherLoading(true);
      const payload = await UserService.getVoucherCheckoutPayload(voucher);
      setVoucherQrPayload(payload);
      setSelectedVoucher(voucher);
      setIsVoucherModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Gagal memproses voucher.');
    } finally {
      setUseVoucherLoading(false);
    }
  };

  // --- RENDER HELPERS ---
  const getVoucherStatus = (voucher: UserVoucher) => {
    if (voucher.isUsed) return { label: 'Used', color: '#6B7280', bg: '#E5E7EB' };
    // Tambahkan fallback agar tidak error jika expiresAt undefined/null
    const expDate = new Date(voucher.expiresAt || 0).getTime();
    const isExpired = expDate < Date.now();
    return isExpired ? { label: 'Expired', color: '#991B1B', bg: '#FEE2E2' } : { label: 'Active', color: '#166534', bg: '#DCFCE7' };
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{activeTab === 'catalog' ? 'Redeem Catalog' : 'My Vouchers'}</Text>
      
      <LinearGradient colors={['#2A1F1F', '#4A3B32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLabel}>Available Points</Text>
          <Text style={styles.balanceValue}>{availablePoints.toLocaleString('id-ID')}</Text>
          <Text style={styles.pendingBalanceText}>
            {pendingPoints > 0
              ? `${pendingPoints.toLocaleString('id-ID')} pts pending validation`
              : 'No points on hold right now'}
          </Text>
        </View>
        <Star size={24} color="#D4A853" fill="#D4A853" />
      </LinearGradient>

      <View style={styles.pendingInfoCard}>
        <Text style={styles.pendingInfoTitle}>Pending points are waiting for admin validation</Text>
        <Text style={styles.pendingInfoBody}>
          Only available points can be redeemed. Pending points will move into your balance after the transaction is verified.
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'catalog' && styles.activeTab]} onPress={() => setActiveTab('catalog')}>
          <Text style={activeTab === 'catalog' ? styles.activeTabText : styles.tabText}>All Rewards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'vouchers' && styles.activeTab]} onPress={() => setActiveTab('vouchers')}>
          <Text style={activeTab === 'vouchers' ? styles.activeTabText : styles.tabText}>
            My Vouchers {(member?.vouchers?.filter(v => !v.isUsed).length ?? 0) > 0 && `(${member?.vouchers?.filter(v => !v.isUsed).length})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRewardItem = ({ item }: { item: RewardItem }) => {
    const canAfford = availablePoints >= item.pointsCost;
    return (
      <View style={styles.rewardCard}>
        <View style={styles.imageContainer}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.rewardImage} /> : <View style={styles.placeholderImage}><Gift size={32} color="#8C7B75" /></View>}
          <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.category || 'Beverage'}</Text></View>
        </View>
        <View style={styles.rewardInfo}>
          <Text style={styles.rewardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.rewardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.priceRow}>
            <View style={styles.pointsBadge}><Star size={12} color="#B91C2F" fill="#B91C2F" /><Text style={styles.pointsText}>{item.pointsCost} Pts</Text></View>
            <TouchableOpacity style={[styles.redeemBtn, !canAfford && styles.disabledBtn]} onPress={() => handleRedeem(item)} disabled={redeemingId === item.id || !canAfford}>
              {redeemingId === item.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.redeemBtnText}>{canAfford ? 'Redeem' : 'Insufficient'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderVoucherItem = ({ item }: { item: UserVoucher }) => {
    const status = getVoucherStatus(item);
    return (
      <TouchableOpacity style={styles.voucherCard} onPress={() => handleUseVoucher(item)} disabled={item.isUsed}>
        <View style={styles.voucherTop}>
          <View style={styles.voucherTitleRow}>
            <View style={styles.voucherIconWrap}>
              <Ticket size={16} color="#B91C2F" />
            </View>
            <View style={styles.voucherTitleContent}>
              <Text style={styles.voucherLabel}>Voucher</Text>
              <Text style={styles.voucherTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.voucherCodePanel}>
          <Text style={styles.voucherCodeLabel}>Code</Text>
          <Text style={styles.voucherCode} numberOfLines={1}>
            {item.code}
          </Text>
        </View>

        <View style={styles.voucherFooter}>
          <View>
            <Text style={styles.voucherExpiryLabel}>Valid until</Text>
            <Text style={styles.voucherExpiry}>
              {new Date(item.expiresAt || 0).toLocaleDateString('id-ID')}
            </Text>
          </View>
          <View style={styles.voucherAction}>
            <Text style={styles.voucherActionText}>View</Text>
            <ChevronRight size={16} color="#BCC1D3" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenFadeTransition>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <DecorativeBackground />
        <View style={[styles.content, { paddingTop: insets.top }]}>
          {activeTab === 'catalog' ? (
            <FlatList
              data={rewards}
              keyExtractor={(item) => item.id}
              renderItem={renderRewardItem}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#B91C2F']} />}
            />
          ) : (
            <FlatList
              data={member?.vouchers?.slice().reverse() ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderVoucherItem}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Belum ada voucher. Tukar poin di katalog!</Text></View>}
            />
          )}
        </View>

        {/* Modal QR Voucher */}
        <Modal visible={isVoucherModalVisible} transparent animationType="fade" onRequestClose={() => setIsVoucherModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setIsVoucherModalVisible(false)} />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Scan at Cashier</Text>
              <Text style={styles.modalSubtitle}>{selectedVoucher?.title}</Text>
              <View style={styles.qrWrap}>
                {voucherQrPayload ? <QRCode value={voucherQrPayload} size={180} /> : <ActivityIndicator color="#B91C2F" />}
              </View>
              <Text style={styles.modalCode}>{selectedVoucher?.code}</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setIsVoucherModalVisible(false)}><Text style={styles.closeBtnText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  content: { flex: 1 },
  header: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2A1F1F', marginBottom: 16 },
  balanceCard: { padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  balanceValue: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  pendingBalanceText: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 6, maxWidth: 210 },
  pendingInfoCard: { backgroundColor: '#FFF4E8', borderColor: '#F3D7B0', borderWidth: 1, padding: 14, borderRadius: 16, marginBottom: 18 },
  pendingInfoTitle: { fontSize: 13, fontWeight: '800', color: '#7C2D12', marginBottom: 4 },
  pendingInfoBody: { fontSize: 12, lineHeight: 18, color: '#9A5B2A' },
  tabs: { flexDirection: 'row', gap: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3E9DC' },
  activeTab: { backgroundColor: '#B91C2F' },
  tabText: { color: '#8C7B75', fontWeight: '600' },
  activeTabText: { color: '#FFF', fontWeight: 'bold' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  rewardCard: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 16, overflow: 'hidden', elevation: 3 },
  imageContainer: { width: '100%', height: 160, backgroundColor: '#F5F1ED' },
  rewardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '700', color: '#B91C2F', textTransform: 'uppercase' },
  rewardInfo: { padding: 16 },
  rewardTitle: { fontSize: 18, fontWeight: '800', color: '#2A1F1F', marginBottom: 4 },
  rewardDesc: { fontSize: 13, color: '#8C7B75', lineHeight: 18, marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pointsText: { fontSize: 15, fontWeight: '700', color: '#B91C2F' },
  redeemBtn: { backgroundColor: '#111827', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  redeemBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  disabledBtn: { backgroundColor: '#E5E7EB' },
  voucherCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 22,
    marginBottom: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0E8E2',
    shadowColor: '#2A1F1F',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  voucherTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  voucherTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 12,
  },
  voucherIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FFF1F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
    flexShrink: 0,
  },
  voucherTitleContent: {
    flex: 1,
    minWidth: 0,
  },
  voucherLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C2F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A1F1F',
    lineHeight: 22,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  voucherCodePanel: {
    backgroundColor: '#FCF8F4',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F2EAE3',
  },
  voucherCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C7B75',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  voucherCode: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B91C2F',
    letterSpacing: 1,
  },
  voucherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  voucherExpiryLabel: {
    fontSize: 10,
    color: '#A08F88',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginBottom: 2,
  },
  voucherExpiry: { fontSize: 12, color: '#6C5F5A', fontWeight: '600' },
  voucherAction: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  voucherActionText: { fontSize: 12, fontWeight: '700', color: '#A08F88' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { width: '85%', backgroundColor: '#FFF', borderRadius: 30, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2A1F1F', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#8C7B75', marginBottom: 20 },
  qrWrap: { padding: 16, backgroundColor: '#F5F1ED', borderRadius: 20, marginBottom: 16 },
  modalCode: { fontSize: 20, fontWeight: 'bold', color: '#B91C2F', letterSpacing: 2, marginBottom: 24 },
  closeBtn: { backgroundColor: '#111827', width: '100%', padding: 14, borderRadius: 16, alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontWeight: 'bold' },
  center: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8C7B75', textAlign: 'center' },
});
