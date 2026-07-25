import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  useWindowDimensions, StyleSheet, RefreshControl,
} from 'react-native';
import { Bell } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMember } from '../context/MemberContext';
import { buildLegacyHomeLoyaltyViewModel } from '../application/homeLoyalty/HomeLoyaltyViewModel';
import { firebaseAuth } from '../config/firebase';
import { NotificationService } from '../services/NotificationService';
import { usePromotions } from '../composition/promotions';
import type { RootTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import type { NotificationItem } from '../types/types';

import { colors } from '../theme/colorTokens';

import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import UserAvatar from '../components/UserAvatar';
import SkeletonLoader from '../components/SkeletonLoader';
import NotificationSheet from '../components/NotificationSheet';
import {
  HomeMembershipRegion,
  HomeWalletRegion,
} from '../presentation/homeLoyalty/HomeLoyaltyWalletView';
import { getGreeting } from '../utils/greetingHelper';

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
  const carouselPromos = usePromotions('carousel');
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

  const loyaltyModel = useMemo(
    () => buildLegacyHomeLoyaltyViewModel(member),
    [member],
  );
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
            <HomeMembershipRegion
              model={loyaltyModel}
              loading={isMemberLoading}
              onPress={() => navigation.navigate('MembershipStatus')}
            />

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

            <HomeWalletRegion
              model={loyaltyModel}
              loading={isMemberLoading}
              onAction={() => navigation.navigate('Rewards')}
            />
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
});
