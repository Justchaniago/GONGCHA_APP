import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, useWindowDimensions, Modal, Pressable, Animated
} from 'react-native';

const AnimatedFlatList = Animated.FlatList as typeof Animated.FlatList;
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
  pointsrequired: number;
  imageUrl?: string;
  category?: string;
  isActive?: boolean;
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

  const [showUsedVouchers, setShowUsedVouchers] = useState(false);

  // Modal State
  const [selectedVoucher, setSelectedVoucher] = useState<UserVoucher | null>(null);
  const [voucherQrPayload, setVoucherQrPayload] = useState<string>('');
  const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
  const [useVoucherLoading, setUseVoucherLoading] = useState(false);
  const availablePoints = member?.currentPoints ?? member?.points ?? 0;
  const pendingPoints = member?.pendingPoints ?? 0;

  const scrollY = useRef(new Animated.Value(0)).current;
  const MINI_THRESHOLD = 155;
  const miniOpacity = scrollY.interpolate({
    inputRange: [MINI_THRESHOLD, MINI_THRESHOLD + 48],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const miniTranslateY = scrollY.interpolate({
    inputRange: [MINI_THRESHOLD, MINI_THRESHOLD + 48],
    outputRange: [-22, 0],
    extrapolate: 'clamp',
  });

  const handleTabSwitch = (tab: RewardsTab) => {
    setActiveTab(tab);
    scrollY.setValue(0);
  };

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

  // --- LOGIKA REDEEM ---
  const handleRedeem = async (reward: RewardItem) => {
    if (availablePoints < reward.pointsrequired) {
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

    Alert.alert('Tukar Reward?', `Gunakan ${reward.pointsrequired} poin untuk "${reward.title}"?`, [
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


      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'catalog' && styles.activeTab]} onPress={() => handleTabSwitch('catalog')}>
          <Text style={activeTab === 'catalog' ? styles.activeTabText : styles.tabText}>All Rewards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'vouchers' && styles.activeTab]} onPress={() => handleTabSwitch('vouchers')}>
          <Text style={activeTab === 'vouchers' ? styles.activeTabText : styles.tabText}>
            My Vouchers {(member?.vouchers?.filter(v => !v.isUsed).length ?? 0) > 0 && `(${member?.vouchers?.filter(v => !v.isUsed).length})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRewardItem = ({ item }: { item: RewardItem }) => {
    const canAfford = availablePoints >= (item.pointsrequired ?? 0);
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
            <View style={styles.pointsBadge}><Star size={12} color="#B91C2F" fill="#B91C2F" /><Text style={styles.pointsText}>{item.pointsrequired} Pts</Text></View>
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
            <AnimatedFlatList
              data={rewards}
              keyExtractor={(item) => item.id}
              renderItem={renderRewardItem}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#B91C2F']} />}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
              scrollEventThrottle={16}
            />
          ) : (
            <AnimatedFlatList
              data={member?.vouchers?.slice().reverse().filter(v => !v.isUsed) ?? []}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
              scrollEventThrottle={16}
              keyExtractor={(item) => item.id ?? item.code}
              renderItem={renderVoucherItem}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>Belum ada voucher. Tukar poin di katalog!</Text></View>}
              ListFooterComponent={() => {
                const usedVouchers = member?.vouchers?.filter(v => v.isUsed) ?? [];
                if (usedVouchers.length === 0) return null;
                return (
                  <View style={styles.usedSection}>
                    <TouchableOpacity style={styles.usedToggle} onPress={() => setShowUsedVouchers(p => !p)}>
                      <Text style={styles.usedToggleText}>Used Vouchers ({usedVouchers.length})</Text>
                      <ChevronRight size={16} color="#8C7B75" style={{ transform: [{ rotate: showUsedVouchers ? '90deg' : '0deg' }] }} />
                    </TouchableOpacity>
                    {showUsedVouchers && usedVouchers.slice().reverse().map(v => (
                      <View key={v.id ?? v.code} style={styles.usedVoucherCard}>
                        <View style={styles.usedVoucherRow}>
                          <View style={styles.usedVoucherIconWrap}>
                            <Ticket size={14} color="#8C7B75" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.usedVoucherTitle} numberOfLines={1}>{v.title}</Text>
                            <Text style={styles.usedVoucherCode}>{v.code}</Text>
                          </View>
                          <View style={styles.usedBadge}>
                            <Text style={styles.usedBadgeText}>Used</Text>
                          </View>
                        </View>
                        <View style={styles.usedVoucherMeta}>
                          {v.redeemedAt ? (
                            <Text style={styles.usedVoucherMetaText}>
                              {new Date(v.redeemedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' · '}
                              {new Date(v.redeemedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          ) : null}
                          {v.usedAtStore ? (
                            <Text style={styles.usedVoucherMetaText}>{v.usedAtStore}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              }}
            />
          )}
        </View>

        {/* Mini sticky points header — morphs in when balance card scrolls off screen */}
        <Animated.View
          pointerEvents="none"
          style={[styles.miniHeader, { top: insets.top + 6, opacity: miniOpacity, transform: [{ translateY: miniTranslateY }] }]}
        >
          <LinearGradient colors={['#2A1F1F', '#4A3B32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.miniHeaderGradient}>
            <Star size={11} color="#D4A853" fill="#D4A853" />
            <Text style={styles.miniHeaderPts}>{availablePoints.toLocaleString('id-ID')} pts</Text>
            {pendingPoints > 0 && (
              <>
                <View style={styles.miniHeaderSep} />
                <Text style={styles.miniHeaderPending}>+{pendingPoints.toLocaleString('id-ID')} pending</Text>
              </>
            )}
          </LinearGradient>
        </Animated.View>

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
  pendingChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF4E8', borderColor: '#F3D7B0', borderWidth: 1, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, marginBottom: 14, alignSelf: 'flex-start' },
  pendingChipDot: { fontSize: 13 },
  pendingChipText: { fontSize: 12, color: '#9A5B2A' },
  pendingChipPts: { fontWeight: '800', color: '#7C2D12' },
  miniHeader: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  miniHeaderGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  miniHeaderPts: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  miniHeaderSep: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2 },
  miniHeaderPending: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
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
  usedSection: { marginTop: 8, marginBottom: 8 },
  usedToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: '#F0E8E2' },
  usedToggleText: { fontSize: 13, fontWeight: '700', color: '#8C7B75' },
  usedVoucherCard: { backgroundColor: '#F9F7F5', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#EDE8E3' },
  usedVoucherRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usedVoucherIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#EDE8E3', alignItems: 'center', justifyContent: 'center' },
  usedVoucherTitle: { fontSize: 13, fontWeight: '700', color: '#6C5F5A' },
  usedVoucherCode: { fontSize: 11, color: '#A08F88', letterSpacing: 0.5, marginTop: 1 },
  usedBadge: { backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  usedBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  usedVoucherMeta: { flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EDE8E3', flexWrap: 'wrap' },
  usedVoucherMetaText: { fontSize: 11, color: '#A08F88' },
  emptyText: { color: '#8C7B75', textAlign: 'center' },
});
