import React, { useRef, useState } from 'react';
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
import { Trophy, Gift, Star, Ticket, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import type { RewardDisplayItem, RewardsViewModel, VoucherDisplayItem } from '../../application/rewards/RewardsViewModel';
import DecorativeBackground from '../../components/DecorativeBackground';
import ScreenFadeTransition from '../../components/ScreenFadeTransition';
import { RedemptionConfirmModal } from './RedemptionConfirmModal';
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
  onBack,
}: RewardsViewProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'catalog' | 'vouchers'>('catalog');
  const [showUsedVouchers, setShowUsedVouchers] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDisplayItem | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<RewardDisplayItem | null>(null);

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

  const handleTabSwitch = (tab: 'catalog' | 'vouchers') => {
    setActiveTab(tab);
    scrollY.setValue(0);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#B91C2F" />
        <Text style={styles.loadingText}>Memuat Katalog Hadiah...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#2A1F1F', '#4A3B32']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceCard}
      >
        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Leaves Tersedia</Text>
          <Text style={styles.balanceValue}>{model.availableLeavesLabel}</Text>
          <Text style={styles.pendingBalanceText}>
            {model.pendingLeavesLabel || 'Tidak ada Leaves tertunda'}
          </Text>
        </View>
        <Star size={24} color="#D4A853" fill="#D4A853" />
      </LinearGradient>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'catalog' && styles.activeTab]}
          onPress={() => handleTabSwitch('catalog')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'catalog' }}
        >
          <Text style={activeTab === 'catalog' ? styles.activeTabText : styles.tabText}>
            Semua Hadiah
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vouchers' && styles.activeTab]}
          onPress={() => handleTabSwitch('vouchers')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'vouchers' }}
        >
          <Text style={activeTab === 'vouchers' ? styles.activeTabText : styles.tabText}>
            Voucher Saya {model.activeVouchers.length > 0 && `(${model.activeVouchers.length})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRewardItem = ({ item }: { item: RewardDisplayItem }) => {
    return (
      <TouchableOpacity
        style={styles.bentoGridCard}
        onPress={() => setConfirmingItem(item)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Tukar ${item.title}`}
      >
        <View style={styles.bentoImageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.bentoRewardImage} resizeMode="cover" />
          ) : (
            <View style={styles.bentoPlaceholderImage}>
              <Gift size={36} color="#B91C2F" />
            </View>
          )}
          <View style={styles.bentoCategoryBadge}>
            <Text style={styles.bentoCategoryText}>{item.category || 'Minuman'}</Text>
          </View>
        </View>

        <View style={styles.bentoCardContent}>
          <Text style={styles.bentoRewardTitle} numberOfLines={2}>{item.title}</Text>

          <View style={styles.bentoPriceRow}>
            <View style={styles.bentoPointsBadge}>
              <Star size={11} color="#B91C2F" fill="#B91C2F" />
              <Text style={styles.bentoPointsText}>{item.pointsRequiredLabel}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVoucherItem = ({ item }: { item: VoucherDisplayItem }) => {
    return (
      <TouchableOpacity
        style={styles.bentoGridCard}
        onPress={() => setSelectedVoucher(item)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Gunakan voucher ${item.title}`}
      >
        <View style={styles.bentoImageContainer}>
          <View style={styles.bentoPlaceholderImage}>
            <Ticket size={36} color="#B91C2F" />
          </View>
          <View style={[styles.bentoCategoryBadge, { backgroundColor: '#166534' }]}>
            <Text style={styles.bentoCategoryText}>AKTIF</Text>
          </View>
        </View>

        <View style={styles.bentoCardContent}>
          <Text style={styles.bentoRewardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.bentoPriceRow}>
            <Text style={styles.bentoExpiryText} numberOfLines={1}>
              {item.formattedExpiry}
            </Text>
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

        {/* Custom Header with back button and Leaves Pill */}
        <View style={[styles.topNavBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.navLeft}>
            {onBack && (
              <TouchableOpacity
                onPress={onBack}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Kembali"
              >
                <ArrowLeft size={24} color="#2A1F1F" />
              </TouchableOpacity>
            )}
            <Text style={styles.navTitle}>
              {activeTab === 'catalog' ? 'Katalog Hadiah' : 'Voucher Saya'}
            </Text>
          </View>
          <View style={styles.leavesPill}>
            <Gift size={14} color="#B91C2F" />
            <Text style={styles.leavesPillText}>{model.availableLeavesLabel}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {activeTab === 'catalog' ? (
            <AnimatedFlatList
              key="catalog-grid"
              data={model.catalogItems}
              keyExtractor={(item) => item.id}
              renderItem={renderRewardItem}
              numColumns={2}
              columnWrapperStyle={styles.gridColumnWrapper}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#B91C2F']} />
              }
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
              scrollEventThrottle={16}
            />
          ) : (
            <AnimatedFlatList
              key="vouchers-grid"
              data={model.activeVouchers}
              keyExtractor={(item) => item.id}
              renderItem={renderVoucherItem}
              numColumns={2}
              columnWrapperStyle={styles.gridColumnWrapper}
              ListHeaderComponent={renderHeader}
              contentContainerStyle={styles.listContainer}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
              scrollEventThrottle={16}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>Belum ada voucher aktif. Yuk tukar poin di katalog!</Text>
                </View>
              }

              ListFooterComponent={() => {
                if (!model.historyVouchers || model.historyVouchers.length === 0) return null;
                return (
                  <View style={styles.usedSection}>
                    <TouchableOpacity
                      style={styles.usedToggle}
                      onPress={() => setShowUsedVouchers((p) => !p)}
                    >
                      <Text style={styles.usedToggleText}>
                        Voucher Digunakan ({model.historyVouchers.length})
                      </Text>
                      <ChevronRight
                        size={16}
                        color="#8C7B75"
                        style={{ transform: [{ rotate: showUsedVouchers ? '90deg' : '0deg' }] }}
                      />
                    </TouchableOpacity>
                    {showUsedVouchers &&
                      model.historyVouchers.map((v) => (
                        <View key={v.id} style={styles.usedVoucherCard}>
                          <View style={styles.usedVoucherRow}>
                            <View style={styles.usedVoucherIconWrap}>
                              <Ticket size={14} color="#8C7B75" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.usedVoucherTitle} numberOfLines={1}>
                                {v.title}
                              </Text>
                              <Text style={styles.usedVoucherCode}>{v.code}</Text>
                            </View>
                            <View
                              style={[
                                styles.statusBadge,
                                v.status === 'expired' ? styles.expiredBadge : styles.usedBadge,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusText,
                                  v.status === 'expired' ? styles.expiredText : styles.usedText,
                                ]}
                              >
                                {v.status === 'expired' ? 'Expired' : 'Used'}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.usedVoucherMeta}>
                            <Text style={styles.usedVoucherMetaText}>{v.formattedExpiry}</Text>
                            {v.description ? (
                              <Text style={styles.usedVoucherMetaText}>{v.description}</Text>
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
          style={[
            styles.miniHeader,
            { top: insets.top + 50, opacity: miniOpacity, transform: [{ translateY: miniTranslateY }] },
          ]}
        >
          <LinearGradient
            colors={['#2A1F1F', '#4A3B32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.miniHeaderGradient}
          >
            <Star size={11} color="#D4A853" fill="#D4A853" />
            <Text style={styles.miniHeaderPts}>{model.availableLeavesLabel}</Text>
            {model.pendingLeavesLabel && (
              <>
                <View style={styles.miniHeaderSep} />
                <Text style={styles.miniHeaderPending}>{model.pendingLeavesLabel}</Text>
              </>
            )}
          </LinearGradient>
        </Animated.View>

        <RedemptionConfirmModal
          visible={!!confirmingItem}
          item={confirmingItem}
          onClose={() => setConfirmingItem(null)}
          onConfirm={() => {
            if (confirmingItem) {
              const target = confirmingItem;
              setConfirmingItem(null);
              onRedeemReward(target);
            }
          }}
        />

        <VoucherDetailModal
          visible={!!selectedVoucher}
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
        />
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0' },
  loadingText: { color: '#8C7B75', marginTop: 12, fontSize: 14, fontWeight: '600' },
  topNavBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EAE3',
    backgroundColor: '#FFF8F0',
    zIndex: 10,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2A1F1F',
  },
  leavesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  leavesPillText: { color: '#B91C2F', fontSize: 12, fontWeight: '800' },
  content: { flex: 1 },
  header: { paddingBottom: 16 },
  balanceCard: {
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  balanceInfo: { flex: 1, marginRight: 12 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  balanceValue: { color: '#FFF', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  pendingBalanceText: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 6 },
  tabs: { flexDirection: 'row', gap: 10 },
  tab: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, backgroundColor: '#F3E9DC' },
  activeTab: { backgroundColor: '#B91C2F' },
  tabText: { color: '#8C7B75', fontWeight: '700', fontSize: 13 },
  activeTabText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  rewardCard: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 16, overflow: 'hidden', elevation: 3, shadowColor: '#2A1F1F', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  imageContainer: { width: '100%', height: 160, backgroundColor: '#F5F1ED' },
  rewardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  categoryBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '800', color: '#B91C2F', textTransform: 'uppercase' },
  rewardInfo: { padding: 16 },
  rewardTitle: { fontSize: 18, fontWeight: '800', color: '#2A1F1F', marginBottom: 4 },
  rewardDesc: { fontSize: 13, color: '#8C7B75', lineHeight: 18, marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pointsText: { fontSize: 15, fontWeight: '800', color: '#B91C2F' },
  redeemBtn: { backgroundColor: '#2A1F1F', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  redeemBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
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
    fontSize: 10,
    fontWeight: '800',
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
  activeStatusBadge: { backgroundColor: '#DCFCE7' },
  activeStatusText: { color: '#166534' },
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
  center: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8C7B75', textAlign: 'center', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  miniHeader: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  miniHeaderGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 999, elevation: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  miniHeaderPts: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  miniHeaderSep: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.25)' },
  miniHeaderPending: { color: '#D4A853', fontSize: 11, fontWeight: '600' },
  morphConfirmContainer: {
    alignItems: 'flex-end',
  },
  morphConfirmText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C2F',
    marginBottom: 4,
  },
  morphBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cancelMorphBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelMorphText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  confirmMorphBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmMorphTextBtn: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  bentoGridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E8E2',
    elevation: 3,
    shadowColor: '#2A1F1F',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  bentoImageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: '#FFF1F3',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoRewardImage: {
    width: '100%',
    height: '100%',
  },
  bentoPlaceholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F3',
  },
  bentoCategoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(185, 28, 47, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bentoCategoryText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bentoCardContent: {
    padding: 12,
    justifyContent: 'space-between',
    flex: 1,
  },
  bentoRewardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A1F1F',
    lineHeight: 17,
    marginBottom: 10,
  },
  bentoPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  bentoPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bentoPointsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C2F',
  },
  bentoExpiryText: {
    fontSize: 10,
    color: '#8C7B75',
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
  },
  bentoActionPill: {
    backgroundColor: '#B91C2F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bentoActionPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  disabledBentoPill: {
    backgroundColor: '#D1D5DB',
  },
  usedSection: { marginTop: 12, marginBottom: 8 },
  usedToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: '#F0E8E2' },
  usedToggleText: { fontSize: 13, fontWeight: '700', color: '#8C7B75' },
  usedVoucherCard: { backgroundColor: '#F9F7F5', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#EDE8E3' },
  usedVoucherRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usedVoucherIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#EDE8E3', alignItems: 'center', justifyContent: 'center' },
  usedVoucherTitle: { fontSize: 13, fontWeight: '700', color: '#6C5F5A' },
  usedVoucherCode: { fontSize: 11, color: '#A08F88', letterSpacing: 0.5, marginTop: 1 },
  usedBadge: { backgroundColor: '#E5E7EB' },
  usedText: { color: '#6B7280' },
  expiredBadge: { backgroundColor: '#FEE2E2' },
  expiredText: { color: '#991B1B' },
  usedVoucherMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EDE8E3', flexWrap: 'wrap' },
  usedVoucherMetaText: { fontSize: 11, color: '#A08F88' },
});

