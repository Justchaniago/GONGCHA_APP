import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Star, Ticket, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';

// 🔥 FASE 2: Import Core & UI Components
import { colors } from '../theme/colorTokens';
import { useMember } from '../context/MemberContext';
import SkeletonLoader from '../components/SkeletonLoader';

// Services & Types
import { UserService } from '../services/UserService';
import { CatalogService } from '../services/CatalogService';
import { RewardItem, UserVoucher } from '../types/types';

type RewardsTab = 'catalog' | 'vouchers';

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // 🔥 FASE 2: Gunakan CCTV Realtime (useMember)
  const { member, loading: isMemberLoading } = useMember();

  const [catalog, setCatalog] = useState<RewardItem[]>([]);
  const [availableVouchers, setAvailableVouchers] = useState<RewardItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RewardsTab>('catalog');
  const [selectedVoucher, setSelectedVoucher] = useState<UserVoucher | null>(null);
  const [voucherQrPayload, setVoucherQrPayload] = useState<string>('');
  const [useVoucherLoading, setUseVoucherLoading] = useState(false);
  const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);

  const rewardModalScale = useRef(new Animated.Value(0)).current;
  const rewardModalOpacity = useRef(new Animated.Value(0)).current;
  const isCompact = width < 360;
  const horizontalPadding = isCompact ? 16 : 20;

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const fetchCatalogData = async () => {
    try {
      setLoadingCatalog(true);
      const [catalogData, vouchersData] = await Promise.all([
        CatalogService.getCatalog(),
        CatalogService.getAvailableVouchers()
      ]);
      setCatalog(catalogData);
      setAvailableVouchers(vouchersData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleRedeem = (reward: RewardItem) => {
    if (!member) return;

    if (member.points < reward.pointsCost) {
      Alert.alert('Poin Kurang', `Kamu butuh ${reward.pointsCost - member.points} poin lagi!`);
      return;
    }

    Alert.alert('Konfirmasi Redeem', `Tukar ${reward.pointsCost} poin untuk "${reward.title}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Tukar Sekarang',
        onPress: async () => {
          try {
            setRedeemingId(reward.id);
            await UserService.redeemVoucher(reward);
            // MemberContext akan otomatis mendeteksi perubahan via onSnapshot
            Alert.alert('Berhasil!', 'Voucher berhasil ditambahkan ke akunmu.');
          } catch (error: any) {
            Alert.alert('Gagal', error?.message || 'Terjadi kesalahan saat redeem.');
          } finally {
            setRedeemingId(null);
          }
        },
      },
    ]);
  };

  const getVoucherStatus = (voucher: UserVoucher) => {
    if (voucher.isUsed) return { label: 'Used', color: '#6B7280', bg: '#E5E7EB' };
    const isExpired = new Date(voucher.expiresAt).getTime() < Date.now();
    if (isExpired) return { label: 'Expired', color: '#991B1B', bg: '#FEE2E2' };
    return { label: 'Active', color: '#166534', bg: '#DCFCE7' };
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleUseVoucher = async (voucher: UserVoucher) => {
    const status = getVoucherStatus(voucher);
    if (status.label !== 'Active') {
      Alert.alert('Voucher tidak bisa digunakan', `Status voucher saat ini: ${status.label}.`);
      return;
    }

    try {
      setUseVoucherLoading(true);
      setSelectedVoucher(voucher);
      const payload = await UserService.getVoucherCheckoutPayload(voucher);
      setVoucherQrPayload(payload);
      setIsVoucherModalVisible(true);
    } catch (error: any) {
      Alert.alert('Gagal', error?.message || 'Tidak dapat menyiapkan voucher QR.');
    } finally {
      setUseVoucherLoading(false);
    }
  };

  const openRewardDetail = (reward: RewardItem) => {
    setSelectedReward(reward);
    Animated.parallel([
      Animated.spring(rewardModalScale, { toValue: 1, friction: 6, tension: 52, useNativeDriver: true }),
      Animated.timing(rewardModalOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeRewardDetail = () => {
    Animated.parallel([
      Animated.spring(rewardModalScale, { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }),
      Animated.timing(rewardModalOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setSelectedReward(null));
  };

  const availableVoucherCount = (member?.vouchers || []).filter(v => !v.isUsed && new Date(v.expiresAt).getTime() > Date.now()).length;

  const sortedVouchers = (member?.vouchers || []).slice().sort((a, b) => {
    if (a.isUsed && !b.isUsed) return 1;
    if (!a.isUsed && b.isUsed) return -1;
    const aExp = new Date(a.expiresAt).getTime();
    const bExp = new Date(b.expiresAt).getTime();
    return aExp - bExp;
  });

  // --- RENDERING HELPERS ---

  const renderCatalogSkeleton = () => (
    <View style={[styles.card, { backgroundColor: colors.surface.card }]}>
      <SkeletonLoader height={140} borderRadius={0} />
      <View style={styles.content}>
        <SkeletonLoader width="70%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonLoader width="100%" height={24} style={{ marginBottom: 12 }} />
        <SkeletonLoader width="100%" height={32} borderRadius={12} />
      </View>
    </View>
  );

  const renderVoucherSkeleton = () => (
    <View style={[styles.voucherCard, { backgroundColor: colors.surface.card }]}>
      <View style={styles.voucherTopRow}>
        <SkeletonLoader width="50%" height={18} />
        <SkeletonLoader width="20%" height={18} borderRadius={12} />
      </View>
      <SkeletonLoader width="40%" height={22} style={{ marginTop: 10 }} />
      <View style={{ marginTop: 8 }}>
        <SkeletonLoader width="60%" height={12} style={{ marginBottom: 4 }} />
        <SkeletonLoader width="55%" height={12} />
      </View>
      <SkeletonLoader width="100%" height={40} borderRadius={12} style={{ marginTop: 12 }} />
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
        {activeTab === 'catalog' ? 'Rewards Catalog' : 'My Vouchers'}
      </Text>
      <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
        {activeTab === 'catalog' ? 'Treat yourself with your points' : 'Track and use your redeemed vouchers'}
      </Text>

      <LinearGradient colors={['#2A1F1F', '#4A3B32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <View>
          <Text style={styles.balanceLabel}>Your Points Balance</Text>
          {isMemberLoading ? (
            <SkeletonLoader width={80} height={32} style={{ marginTop: 4, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          ) : (
            <Text style={styles.balanceValue}>{member?.points.toLocaleString() || '0'}</Text>
          )}
        </View>
        <View style={styles.iconCircle}>
          <Star size={24} color={colors.brand.secondary} fill={colors.brand.secondary} />
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'catalog' && styles.activeTab]} onPress={() => setActiveTab('catalog')}>
          <Text style={activeTab === 'catalog' ? styles.activeTabText : styles.tabText}>All Rewards</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'vouchers' && styles.activeTab]} onPress={() => setActiveTab('vouchers')}>
          <Text style={activeTab === 'vouchers' ? styles.activeTabText : styles.tabText}>
            My Vouchers
            {!isMemberLoading && availableVoucherCount > 0 && (
              <Text style={{ color: colors.brand.primary, fontWeight: 'bold' }}> ({availableVoucherCount})</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: RewardItem }) => {
    const isAffordable = (member?.points || 0) >= item.pointsCost;
    const isProcessing = redeemingId === item.id;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface.card }]}>
        <TouchableOpacity style={styles.cardTapArea} activeOpacity={0.8} onPress={() => openRewardDetail(item)}>
          <View style={styles.imageWrap}>
            <Image source={item.image} style={styles.image} resizeMode="contain" />
            <View style={styles.costBadge}>
              <Text style={styles.costText}>{item.pointsCost} Pts</Text>
            </View>
          </View>
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.desc, { color: colors.text.secondary }]} numberOfLines={2}>{item.description}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.cardRedeemButton, !isAffordable && styles.buttonDisabled, isProcessing && styles.buttonProcessing]}
          disabled={!isAffordable || isProcessing}
          onPress={() => handleRedeem(item)}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{isAffordable ? 'Redeem' : 'Not Enough Pts'}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderVoucherItem = ({ item }: { item: UserVoucher }) => {
    const status = getVoucherStatus(item);
    const canUseVoucher = status.label === 'Active';
    const expDate = new Date(item.expiresAt).getTime();
    const expiringSoon = !item.isUsed && expDate > Date.now() && expDate - Date.now() < 3 * 24 * 60 * 60 * 1000;

    return (
      <View style={[styles.voucherCard, { backgroundColor: colors.surface.card, borderColor: colors.border.light }]}>
        <View style={styles.voucherTopRow}>
          <View style={styles.voucherTitleWrap}>
            <Ticket size={16} color={colors.brand.primary} />
            <Text style={[styles.voucherTitle, { color: colors.text.primary }]}>{item.title}</Text>
          </View>
          <View style={[styles.voucherStatusBadge, { backgroundColor: status.bg }]}> 
            <Text style={[styles.voucherStatusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={[styles.voucherCode, { color: colors.brand.primary }]}>{item.code}</Text>
        <View style={styles.voucherMetaRow}>
          <Text style={[styles.voucherMetaLabel, { color: colors.text.secondary }]}>Redeemed: {formatDate(item.redeemedAt)}</Text>
          <Text style={[styles.voucherMetaLabel, { color: colors.text.secondary }]}>Expire: {formatDate(item.expiresAt)}</Text>
        </View>
        {expiringSoon && <Text style={{ color: colors.brand.primary, fontWeight: 'bold', marginTop: 4, fontSize: 11 }}>⚠️ Voucher akan segera expired!</Text>}
        <TouchableOpacity
          style={[styles.useVoucherButton, !canUseVoucher && styles.useVoucherButtonDisabled]}
          onPress={() => handleUseVoucher(item)}
          disabled={!canUseVoucher || useVoucherLoading}
        >
          <Text style={[styles.useVoucherButtonText, !canUseVoucher && styles.useVoucherButtonTextDisabled]}>
            {canUseVoucher ? 'Use at Cashier' : `Voucher ${status.label}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenFadeTransition>
      <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <DecorativeBackground />

        <View style={[styles.container, { paddingTop: insets.top + 4 }]}> 
          {activeTab === 'catalog' ? (
            <FlatList
              data={loadingCatalog ? [1, 2, 3, 4] : catalog}
              keyExtractor={(item: any) => item.id || String(item)}
              renderItem={loadingCatalog ? renderCatalogSkeleton : renderItem}
              ListHeaderComponent={renderHeader}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding, paddingBottom: 120 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={isMemberLoading ? [1, 2, 3] : sortedVouchers}
              keyExtractor={(item: any) => item.id || String(item)}
              renderItem={isMemberLoading ? renderVoucherSkeleton : renderVoucherItem}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>Belum ada voucher</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>Tukar poin di tab All Rewards untuk mendapatkan voucher pertama kamu.</Text>
                </View>
              }
              contentContainerStyle={[styles.voucherListContent, { paddingHorizontal: horizontalPadding, paddingBottom: 120 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* REWARD DETAIL MODAL */}
        <Modal visible={!!selectedReward} transparent animationType="none" statusBarTranslucent onRequestClose={closeRewardDetail}>
          <TouchableWithoutFeedback onPress={closeRewardDetail}>
            <Animated.View style={[styles.rewardModalOverlay, { opacity: rewardModalOpacity }]}> 
              <BlurView intensity={20} style={StyleSheet.absoluteFillObject}> 
                <View style={styles.rewardModalOverlayContent}> 
                  <TouchableWithoutFeedback>
                    <Animated.View style={[styles.rewardModalContent, { transform: [{ scale: rewardModalScale }], backgroundColor: colors.background.primary, borderColor: colors.border.light }]}> 
                      {selectedReward && (
                        <>
                          <TouchableOpacity style={styles.rewardModalClose} onPress={closeRewardDetail}>
                            <X size={22} color={colors.text.primary} />
                          </TouchableOpacity>
                          <View style={styles.rewardModalImageWrap}>
                            <Image source={selectedReward.image} style={styles.rewardModalImage} resizeMode="contain" />
                            <View style={styles.rewardModalCostBadge}>
                              <Text style={styles.rewardModalCostText}>{selectedReward.pointsCost} Pts</Text>
                            </View>
                          </View>
                          <Text style={[styles.rewardModalTitle, { color: colors.text.primary }]}>{selectedReward.title}</Text>
                          <Text style={[styles.rewardModalCategory, { color: colors.text.secondary }]}>{selectedReward.category}</Text>
                          <Text style={[styles.rewardModalDesc, { color: colors.text.secondary }]}>{selectedReward.description}</Text>
                          <TouchableOpacity
                            style={[styles.rewardModalRedeem, { backgroundColor: colors.brand.primary }, ((member?.points || 0) < selectedReward.pointsCost || redeemingId === selectedReward.id) && styles.buttonDisabled]}
                            disabled={(member?.points || 0) < selectedReward.pointsCost || redeemingId === selectedReward.id}
                            onPress={() => handleRedeem(selectedReward)}
                          >
                            {redeemingId === selectedReward.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.rewardModalRedeemText}>{(member?.points || 0) >= selectedReward.pointsCost ? 'Redeem Now' : 'Not Enough Pts'}</Text>}
                          </TouchableOpacity>
                        </>
                      )}
                    </Animated.View>
                  </TouchableWithoutFeedback>
                </View>
              </BlurView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* QR MODAL */}
        <Modal visible={isVoucherModalVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setIsVoucherModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.modalBackdrop} onPress={() => setIsVoucherModalVisible(false)} />
            <View style={[styles.modalCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Scan Voucher at Cashier</Text>
              <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>{selectedVoucher?.title || 'Voucher'}</Text>
              <View style={[styles.modalQrWrap, { borderColor: colors.border.light }]}>
                {voucherQrPayload ? <QRCode value={voucherQrPayload} size={170} backgroundColor="transparent" color={colors.text.primary} /> : <ActivityIndicator size="large" color={colors.brand.primary} />}
              </View>
              <Text style={[styles.modalCodeLabel, { color: colors.brand.primary }]}>{selectedVoucher?.code || '-'}</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalSecondaryBtn, { borderColor: colors.border.medium }]} onPress={() => setIsVoucherModalVisible(false)}>
                  <Text style={styles.modalSecondaryText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  container: { flex: 1, zIndex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  balanceCard: { padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, elevation: 5 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  balanceValue: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', marginBottom: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10 },
  activeTab: { backgroundColor: '#B91C2F' },
  tabText: { color: '#8C7B75', fontWeight: '600' },
  activeTabText: { color: '#FFF', fontWeight: 'bold' },
  listContent: { paddingBottom: 120 },
  voucherListContent: { paddingBottom: 120 },
  columnWrapper: { justifyContent: 'space-between' },
  card: { width: '48%', borderRadius: 20, marginBottom: 16, overflow: 'hidden', elevation: 3 },
  cardTapArea: { width: '100%' },
  imageWrap: { height: 140, backgroundColor: '#FFF5E1', alignItems: 'center', justifyContent: 'center', padding: 10 },
  image: { width: '80%', height: '80%' },
  costBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  costText: { fontSize: 12, fontWeight: 'bold', color: '#B91C2F' },
  content: { padding: 12 },
  title: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  desc: { fontSize: 11, marginBottom: 12, height: 32 },
  button: { paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { backgroundColor: '#E5E7EB' },
  buttonProcessing: { backgroundColor: '#8E1624' },
  buttonText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  cardRedeemButton: { marginHorizontal: 12, marginBottom: 12 },
  rewardModalOverlay: { flex: 1 },
  rewardModalOverlayContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  rewardModalContent: { width: '100%', maxWidth: 360, borderRadius: 22, padding: 18, borderWidth: 1, alignItems: 'center' },
  rewardModalClose: { position: 'absolute', top: 12, right: 12, zIndex: 2, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  rewardModalImageWrap: { width: '100%', height: 190, borderRadius: 18, backgroundColor: '#FFF5E1', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  rewardModalImage: { width: '76%', height: '76%' },
  rewardModalCostBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  rewardModalCostText: { fontSize: 12, fontWeight: '800', color: '#B91C2F' },
  rewardModalTitle: { marginTop: 14, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  rewardModalCategory: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  rewardModalDesc: { marginTop: 10, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  rewardModalRedeem: { marginTop: 16, width: '100%', borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  rewardModalRedeemText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  voucherCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12, elevation: 2 },
  voucherTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  voucherTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8, gap: 6 },
  voucherTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  voucherStatusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  voucherStatusText: { fontSize: 11, fontWeight: '700' },
  voucherCode: { marginTop: 10, fontSize: 18, letterSpacing: 1, fontWeight: '800' },
  voucherMetaRow: { marginTop: 8, gap: 2 },
  voucherMetaLabel: { fontSize: 11 },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { marginTop: 6, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  useVoucherButton: { marginTop: 10, backgroundColor: '#B91C2F', borderRadius: 12, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  useVoucherButtonDisabled: { backgroundColor: '#E5E7EB' },
  useVoucherButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  useVoucherButtonTextDisabled: { color: '#6B7280' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 18, borderWidth: 1, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSubtitle: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  modalQrWrap: { marginTop: 14, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, borderWidth: 1 },
  modalCodeLabel: { marginTop: 12, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  modalActions: { marginTop: 16, width: '100%', flexDirection: 'row', gap: 10 },
  modalSecondaryBtn: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  modalSecondaryText: { color: '#6B7280', fontWeight: '700' },
  modalPrimaryBtn: { flex: 1, borderRadius: 12, backgroundColor: '#B91C2F', paddingVertical: 10, alignItems: 'center' },
  modalPrimaryText: { color: '#FFFFFF', fontWeight: '700' },
});