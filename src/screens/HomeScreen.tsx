import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  useWindowDimensions, StyleSheet, RefreshControl,
} from 'react-native';
import { Trophy, Gift, ChevronRight, Bell } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMember } from '../context/MemberContext';
import { firebaseAuth } from '../config/firebase';
import { NotificationService } from '../services/NotificationService';
import { PromotionService, PromotionItem } from '../services/PromotionService';
import type { RootTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import type { UserTier, NotificationItem } from '../types/types';

import { colors } from '../theme/colorTokens';

import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import UserAvatar from '../components/UserAvatar';
import SkeletonLoader from '../components/SkeletonLoader';
import NotificationSheet from '../components/NotificationSheet';
import { getGreeting } from '../utils/greetingHelper';

type HomeTier = Extract<UserTier, 'Silver' | 'Gold' | 'Platinum'>;

const TIER_THEME: Record<HomeTier, any> = {
  Silver: {
    progressGradient: ['#B7C0CC', '#8A93A1'],
    tierBadgeBg: '#E5E7EB', tierText: '#4B5563', percentBadgeBg: '#6B7280',
    progressTrackBg: '#ECEFF3', rewardsBorder: '#CBD5E1', rewardsShadow: '#94A3B8',
    footerIcon: '#6B7280', walletGradient: ['#5B6470', '#2F3742'],
    trophyBg: 'rgba(191, 199, 209, 0.92)', redeemAccent: '#4B5563',
  },
  Gold: {
    progressGradient: ['#D4A853', '#F3C677'],
    tierBadgeBg: '#D4A853', tierText: '#2A1F1F', percentBadgeBg: '#B91C2F',
    progressTrackBg: '#F0E6DA', rewardsBorder: '#E8C97A', rewardsShadow: '#C8960A',
    footerIcon: '#B91C2F', walletGradient: ['#8E0E00', '#1F1C18'],
    trophyBg: 'rgba(212, 168, 83, 0.88)', redeemAccent: '#B91C2F',
  },
  Platinum: {
    progressGradient: ['#A78BFA', '#7C3AED'],
    tierBadgeBg: '#DDD6FE', tierText: '#5B21B6', percentBadgeBg: '#6D28D9',
    progressTrackBg: '#EDE9FE', rewardsBorder: '#C4B5FD', rewardsShadow: '#7C3AED',
    footerIcon: '#6D28D9', walletGradient: ['#4C1D95', '#111827'],
    trophyBg: 'rgba(196, 181, 253, 0.9)', redeemAccent: '#5B21B6',
  },
};

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const isDark = false;
  const navigation = useNavigation<HomeNav>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { member, loading: isMemberLoading } = useMember();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const promoScrollRef = useRef<ScrollView | null>(null);
  const [activePromo, setActivePromo] = useState(0);
  const [carouselPromos, setCarouselPromos] = useState<PromotionItem[]>([]);
  const hasRedirectedToProfileCompletion = useRef(false);

  const isCompact = width < 360;
  const horizontalPadding = isCompact ? 16 : 20;
  const avatarSize = isCompact ? 46 : 52;
  const headerIconSize = isCompact ? 44 : 48;
  const headerLogoSize = isCompact ? 50 : 59;

  useEffect(() => {
    const unsubscribe = NotificationService.subscribeToUserNotifications((notifs) => {
      setNotifications(notifs);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = PromotionService.subscribeByType('carousel', (items) => {
      setCarouselPromos(items);
    });
    return unsubscribe;
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    const userId = firebaseAuth.currentUser?.uid;
    if (userId) await NotificationService.markAllAsRead(userId);
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    await NotificationService.markAsRead(id);
  }, []);

  const handleDeleteNotification = useCallback(async (id: string): Promise<boolean> => {
    return NotificationService.deleteNotification(id);
  }, []);

  const handleNotificationPress = useCallback((item: NotificationItem) => {
    setShowNotifications(false);
    const DEEP_LINK_TYPES: Array<typeof item.type> = ['tx_verified', 'tx_rejected', 'points_pending', 'voucher_injected'];
    if (DEEP_LINK_TYPES.includes(item.type)) {
      setTimeout(() => navigation.navigate('Rewards'), 300);
    }
  }, [navigation]);

  const tierXp = member?.tierXp ?? 0;
  const currentPoints = member?.currentPoints ?? member?.points ?? 0;
  const pendingPoints = member?.pendingPoints ?? 0;
  const tier = ((member?.tier as HomeTier | undefined) ?? 'Silver');
  const tierTheme = TIER_THEME[tier];

  const TIER_LIMITS = { Silver: 0, Gold: 5000, Platinum: 15000 };
  const target = tier === 'Silver' ? TIER_LIMITS.Gold : tier === 'Gold' ? TIER_LIMITS.Platinum : TIER_LIMITS.Platinum;
  const isPlatinum = tier === 'Platinum';
  const progress = isPlatinum ? 100 : Math.max(0, Math.min((tierXp / target) * 100, 100));
  const remainingToNextTier = isPlatinum ? 0 : Math.max(0, target - tierXp);
  const footerMessage = isPlatinum ? 'You are Top Tier!' : `${remainingToNextTier} XP to reach next Tier!`;
  const promoCardWidth = width - 40;

  const promos = useMemo(() => {
    if (carouselPromos.length > 0) {
      return carouselPromos.map((p) => ({ color: '#F3F4F6', image: null, uri: p.imageUrl }));
    }
    return [
      { color: '#FFD1DC', image: require('../../assets/images/promo1.webp'), uri: null },
      { color: '#FFF5E1', image: require('../../assets/images/promo2.webp'), uri: null },
      { color: '#E0F7FA', image: require('../../assets/images/promo3.webp'), uri: null },
    ];
  }, [carouselPromos]);

  // Infinite carousel: [clone-of-last, ...real, clone-of-first]
  const extendedPromos = useMemo(() => [
    promos[promos.length - 1],
    ...promos,
    promos[0],
  ], [promos]);

  const extendedIdxRef = useRef(1);

  // On mount: silently jump to real first item (skip leading clone)
  useEffect(() => {
    const t = setTimeout(() => {
      promoScrollRef.current?.scrollTo({ x: promoCardWidth, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [promoCardWidth]);

  // Auto-scroll — always moves forward
  useEffect(() => {
    if (!promos.length) return;
    const interval = setInterval(() => {
      const next = extendedIdxRef.current + 1;
      extendedIdxRef.current = next;
      promoScrollRef.current?.scrollTo({ x: next * promoCardWidth, animated: true });
      setActivePromo((next - 1 + promos.length) % promos.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [promoCardWidth, promos.length]);

  const handlePromoScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / promoCardWidth);
    if (idx === 0) {
      // Landed on clone-of-last → teleport to real last
      const realLast = promos.length;
      promoScrollRef.current?.scrollTo({ x: realLast * promoCardWidth, animated: false });
      extendedIdxRef.current = realLast;
      setActivePromo(promos.length - 1);
    } else if (idx === promos.length + 1) {
      // Landed on clone-of-first → teleport to real first
      promoScrollRef.current?.scrollTo({ x: promoCardWidth, animated: false });
      extendedIdxRef.current = 1;
      setActivePromo(0);
    } else {
      extendedIdxRef.current = idx;
      setActivePromo(idx - 1);
    }
  };

  return (
    <ScreenFadeTransition>
      <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
        <DecorativeBackground />

        <View style={styles.mainLayout}>
          {/* HEADER */}
          <View style={[
            styles.fixedHeaderContainer,
            {
              paddingTop: insets.top + 6,
              paddingHorizontal: horizontalPadding,
              backgroundColor: colors.background.primary,
              borderBottomColor: isDark ? colors.border.light : 'transparent',
              borderBottomWidth: isDark ? 1 : 0,
              zIndex: 20,
            },
          ]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarWrap}>
                  <UserAvatar name={member?.fullName ?? 'Member'} photoURL={member?.photoURL} size={avatarSize} />
                  <View style={styles.avatarStatusDot} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.greeting, { color: colors.text.secondary }]}>{getGreeting()},</Text>
                  {isMemberLoading ? (
                    <SkeletonLoader width={100} height={20} style={{ marginTop: 4 }} />
                  ) : (
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={[styles.name, { color: colors.text.primary }]}
                    >
                      {member?.fullName ?? 'Member'}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={[
                    styles.notificationBtn,
                    styles.notificationBtnShell,
                    { width: headerIconSize, height: headerIconSize, backgroundColor: colors.surface.card, shadowColor: colors.shadow.color },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setShowNotifications(true)}
                >
                  <Bell size={22} color={colors.brand.primary} strokeWidth={2.5} />
                  {notifications.some((n) => !n.isRead) && (
                    <View style={[styles.notificationBadge, { backgroundColor: colors.brand.primary, borderColor: colors.surface.card }]}>
                      <Text style={styles.notificationBadgeText}>
                        {notifications.filter((n) => !n.isRead).length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Image
                  source={require('../../assets/images/logo1.png')}
                  style={[styles.logoTopRight, { width: headerLogoSize, height: headerLogoSize + 4 }]}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* SCROLLABLE CONTENT */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingBottom: 120 + insets.bottom, paddingTop: 10 }]}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#B91C2F']} tintColor="#B91C2F" />}
          >
            {/* MEMBERSHIP STATUS CARD */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigation.navigate('MembershipStatus')}
              style={[styles.rewardsCard, { backgroundColor: colors.surface.card, borderColor: tierTheme.rewardsBorder, shadowColor: tierTheme.rewardsShadow }]}
            >
              <View style={styles.rewardsHeader}>
                <View>
                  <Text style={[styles.rewardsLabel, { color: colors.text.secondary }]}>MEMBERSHIP STATUS</Text>
                  {isMemberLoading ? (
                    <SkeletonLoader width={90} height={18} style={{ marginTop: 2 }} />
                  ) : (
                    <Text style={[styles.rewardsPoints, { color: colors.text.primary }]}>{`${tierXp} / ${target} XP`}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.tierBadge, { backgroundColor: tierTheme.tierBadgeBg }]}>
                    <Text style={[styles.tierText, { color: tierTheme.tierText }]}>{tier} Tier</Text>
                  </View>
                  <View style={[styles.percentBadge, { backgroundColor: tierTheme.percentBadgeBg }]}>
                    <Text style={styles.percentText}>{Math.round(progress)}%</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: tierTheme.progressTrackBg }]}>
                <LinearGradient
                  colors={tierTheme.progressGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${progress}%` }]}
                />
              </View>
              <View style={styles.rewardsFooter}>
                <Gift size={14} color={tierTheme.footerIcon} />
                {isMemberLoading ? (
                  <SkeletonLoader width={140} height={12} />
                ) : (
                  <Text style={[styles.rewardsFooterText, { color: colors.text.secondary }]}>{footerMessage}</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* SPECIAL OFFERS */}
            <View style={styles.sectionHeader}>
              <View style={[styles.redPill, { backgroundColor: colors.brand.primary }]} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Special Offers</Text>
              <Image source={require('../../assets/images/boba.webp')} style={styles.titleIcon} />
            </View>

            <ScrollView
              ref={promoScrollRef}
              horizontal pagingEnabled showsHorizontalScrollIndicator={false}
              style={styles.promoScroll} contentContainerStyle={{ paddingRight: 20 }}
              onMomentumScrollEnd={handlePromoScrollEnd}
              scrollEventThrottle={16}
            >
              {extendedPromos.map((promo, idx) => (
                <View key={idx} style={[styles.promoCard, { width: promoCardWidth, backgroundColor: colors.surface.card }]}>
                  {promo.uri ? (
                    <Image source={{ uri: promo.uri }} style={styles.promoImage} resizeMode="cover" />
                  ) : promo.image ? (
                    <Image source={promo.image} style={styles.promoImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.promoPlaceholder, { backgroundColor: promo.color }]}>
                      <Text style={{ color: '#8C7B75', fontWeight: 'bold' }}>Promo</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.paginationDots}>
              {promos.map((_, i) => <View key={i} style={[styles.dot, activePromo === i && { backgroundColor: colors.brand.primary, width: 24 }]} />)}
            </View>

            {/* GONG CHA WALLET */}
            <View style={styles.sectionHeader}>
              <View style={[styles.redPill, { backgroundColor: colors.brand.primary }]} />
              <Text style={[styles.walletTitle, { color: colors.text.primary }]}>Gong Cha Wallet</Text>
            </View>

            <LinearGradient colors={tierTheme.walletGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletCard}>
              <Image source={require('../../assets/images/liquid.webp')} style={styles.walletLiquid} />
              <View style={styles.walletTopRow}>
                <View>
                  <Text style={styles.walletLabel}>Gong Cha Wallet</Text>
                  {isMemberLoading ? (
                    <SkeletonLoader width={110} height={32} style={{ marginTop: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  ) : (
                    <>
                      <Text style={styles.walletAmount}>{currentPoints.toLocaleString('id-ID')}</Text>
                      <Text style={styles.walletSubLabel}>Available points</Text>
                    </>
                  )}
                </View>
                <View style={[styles.trophyIconBg, { backgroundColor: tierTheme.trophyBg }]}>
                  <Trophy size={21} color="#2A1F1F" />
                </View>
              </View>
              <View style={styles.walletDivider} />
              <View style={styles.walletBottomRow}>
                <View style={{ flex: 1, paddingRight: 14 }}>
                  <Text style={styles.walletBenefitTitle}>Tier Benefits</Text>
                  <Text style={styles.walletBenefitDesc}>
                    {pendingPoints > 0
                      ? `${pendingPoints.toLocaleString('id-ID')} pts pending validation. Only available points can be redeemed.`
                      : 'Only available points can be redeemed. Pending points will appear here while waiting for validation.'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.redeemButton, { backgroundColor: colors.surface.card }]}
                  onPress={() => navigation.navigate('Rewards')}
                >
                  <Text style={[styles.redeemButtonText, { color: tierTheme.redeemAccent }]}>Redeem Catalog</Text>
                  <ChevronRight size={11} color={tierTheme.redeemAccent} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </ScrollView>
        </View>

        <NotificationSheet
          visible={showNotifications}
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAllRead={handleMarkAllRead}
          onMarkRead={handleMarkRead}
          onDelete={handleDeleteNotification}
          onNotificationPress={handleNotificationPress}
        />
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  mainLayout: { flex: 1 },
  fixedHeaderContainer: { paddingBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, paddingRight: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, position: 'relative', flexShrink: 0 },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatarStatusDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, backgroundColor: '#4CAF50', borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
  greeting: { fontSize: 13, fontWeight: '500' },
  headerTextContainer: { justifyContent: 'center', flex: 1, minWidth: 0 },
  name: { fontSize: 19, fontWeight: 'bold' },
  notificationBtn: { borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  notificationBtnShell: { flexShrink: 0 },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '800',
    lineHeight: 14,
  },
  logoTopRight: { flexShrink: 0 },
  rewardsCard: { borderRadius: 22, padding: 12, marginBottom: 12, borderWidth: 1.5, elevation: 8, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20 },
  rewardsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 },
  rewardsLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.8, marginBottom: 2 },
  rewardsPoints: { fontSize: 16, fontWeight: 'bold' },
  tierBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, marginBottom: 3 },
  tierText: { fontSize: 9, fontWeight: 'bold' },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-end' },
  percentText: { color: '#FFF', fontWeight: 'bold', fontSize: 10 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  rewardsFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardsFooterText: { fontSize: 9, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  redPill: { width: 4, height: 24, borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  titleIcon: { width: 24, height: 24, marginLeft: 8, opacity: 0.8 },
  promoScroll: { marginBottom: 10 },
  promoCard: { height: 180, borderRadius: 24, overflow: 'hidden', elevation: 5 },
  promoImage: { width: '100%', height: '100%' },
  promoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0D6CC' },
  walletTitle: { fontSize: 18, fontWeight: 'bold' },
  walletCard: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 13, position: 'relative', overflow: 'hidden', elevation: 5 },
  walletLiquid: { position: 'absolute', right: -18, bottom: -28, width: 98, height: 146, opacity: 0.28, transform: [{ rotate: '-10deg' }] },
  walletTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 3 },
  walletAmount: { color: '#FFF', fontSize: 26, fontWeight: 'bold', letterSpacing: 0.4 },
  walletSubLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 3, fontWeight: '600' },
  trophyIconBg: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  walletDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 10 },
  walletBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  walletBenefitTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  walletBenefitDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 2, maxWidth: 170 },
  redeemButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, gap: 4, elevation: 2 },
  redeemButtonText: { fontWeight: 'bold', fontSize: 10 },
});
