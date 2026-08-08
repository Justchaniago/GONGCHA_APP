import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  useWindowDimensions, StyleSheet, RefreshControl,
  Animated, Easing, DeviceEventEmitter,
} from 'react-native';

import { Bell } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMember } from '../context/MemberContext';
import {
  buildLegacyHomeLoyaltyViewModel,
  buildLocalHomeLoyaltyViewModel,
} from '../application/homeLoyalty/HomeLoyaltyViewModel';
import { localLoyaltySummaryController } from '../composition/loyaltySummary';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';
import { USE_FASTAPI_BACKEND } from '../config/flags';
import { firebaseAuth } from '../config/firebase';
import { NotificationService } from '../services/NotificationService';
import { usePromotions } from '../composition/promotions';
import { useStores } from '../composition/stores';
import type { RootTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import type { NotificationItem } from '../types/types';

import BentoFeaturedDrinks from '../components/BentoFeaturedDrinks';
import BentoNearbyOutlet from '../components/BentoNearbyOutlet';
import BentoDailyCheckIn from '../components/BentoDailyCheckIn';


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

  const formatMemberName = (name?: string) => {
    if (!name) return 'Member';
    const words = name.trim().split(/\s+/);
    if (words.length > 2) {
      return `${words[0]} ${words[1]}`;
    }
    return name;
  };

  const summaryState = useLocalLoyaltySummary(
    localLoyaltySummaryController,
    member?.uid ?? null,
  );
  const summary = summaryState.phase === 'ready' ? summaryState.summary : null;

  const { stores } = useStores(true);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (USE_FASTAPI_BACKEND) {
      if (summaryState.phase === 'ready') {
        void localLoyaltySummaryController.refresh();
      } else {
        void localLoyaltySummaryController.retry();
      }
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [summaryState.phase]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const promoScrollRef = useRef<ScrollView | null>(null);
  const [activePromo, setActivePromo] = useState(0);
  const carouselPromos = usePromotions('carousel');
  const hasRedirectedToProfileCompletion = useRef(false);

  // ENTRANCE ANIMATION VALUES FOR APP LAUNCH / FIRST ENTRY
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-120)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(35)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Track scroll for auto-hiding tab bar
  const lastScrollY = useRef(0);
  const isTabBarHiddenRef = useRef(false);

  const handleScroll = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (currentY <= 10) {
      // User is at the top, show the tab bar
      if (isTabBarHiddenRef.current) {
        DeviceEventEmitter.emit('TOGGLE_TAB_BAR', false);
        isTabBarHiddenRef.current = false;
      }
    } else if (diff > 15 && currentY > 60) {
      // User is scrolling down, hide the tab bar
      if (!isTabBarHiddenRef.current) {
        DeviceEventEmitter.emit('TOGGLE_TAB_BAR', true);
        isTabBarHiddenRef.current = true;
      }
    } else if (diff < -15) {
      // User is scrolling up, show the tab bar
      if (isTabBarHiddenRef.current) {
        DeviceEventEmitter.emit('TOGGLE_TAB_BAR', false);
        isTabBarHiddenRef.current = false;
      }
    }
    lastScrollY.current = currentY;
  };

  useEffect(() => {
    // Synchronize with Custom Splash Screen exit timing (t = 1100ms)
    const splashSyncDelay = 1100;

    const timer = setTimeout(() => {
      // 1. App Cream Background Fades In
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      // 2. Red Header Slides Down Smoothly as Splash Screen dissolves
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 750,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // 3. Staggered Bento Grid Content Slides Up
      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(contentTranslateY, {
            toValue: 0,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, splashSyncDelay);

    return () => clearTimeout(timer);
  }, []);


  const isCompact = width < 360;

  const horizontalPadding = isCompact ? 16 : 20;
  const avatarSize = isCompact ? 46 : 52;
  const headerIconSize = isCompact ? 44 : 48;
  const headerLogoSize = isCompact ? 50 : 59;

  useEffect(() => {
    if (USE_FASTAPI_BACKEND) {
      setNotifications([]);
      return;
    }
    const unsubscribe = NotificationService.subscribeToUserNotifications((notifs) => {
      setNotifications(notifs);
    });
    return unsubscribe;
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (USE_FASTAPI_BACKEND) return;
    const userId = firebaseAuth?.currentUser?.uid;
    if (userId) await NotificationService.markAllAsRead(userId);
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    if (USE_FASTAPI_BACKEND) return;
    await NotificationService.markAsRead(id);
  }, []);

  const handleDeleteNotification = useCallback(async (id: string): Promise<boolean> => {
    if (USE_FASTAPI_BACKEND) return true;
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
    () => (USE_FASTAPI_BACKEND && summary ? buildLocalHomeLoyaltyViewModel(summary) : buildLegacyHomeLoyaltyViewModel(member)),
    [summary, member],
  );

  const promoCardWidth = width - 40;

  const promos = useMemo(() => {
    if (carouselPromos.length > 0) {
      return carouselPromos.map((p) => ({
        color: '#F3F4F6',
        image: null,
        uri: p.imageUrl,
        title: p.title,
        subtitle: p.subtitle
      }));
    }
    return [
      { color: '#FFD1DC', image: require('../../assets/images/promo1.webp'), uri: null, title: 'Fresh Milk Tea Series', subtitle: 'Experience the new standard of Gong Cha milk tea.' },
      { color: '#FFF5E1', image: require('../../assets/images/promo2.webp'), uri: null, title: 'Buy 1 Get 1 Free', subtitle: 'Double the leaf, double the joy every Friday.' },
      { color: '#E0F7FA', image: require('../../assets/images/promo3.webp'), uri: null, title: 'Download & Get Rewards', subtitle: 'Earn leaves and unlock legendary tier benefits.' },
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
      <Animated.View style={[styles.root, { backgroundColor: colors.background.primary, opacity: bgOpacity }]}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <DecorativeBackground />

        <View style={styles.mainLayout}>
          {/* HEADER (SLIDE-DOWN ENTRANCE) */}
          <Animated.View style={[
            styles.fixedHeaderContainer,
            {
              paddingTop: 62,
              paddingHorizontal: 16,
              paddingBottom: 16,
              backgroundColor: colors.brand.primary,
              borderBottomLeftRadius: 36,
              borderBottomRightRadius: 36,
              borderCurve: 'continuous',
              zIndex: 20,
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}>
            <View style={styles.headerContent}>
              {/* LEFT AREA: Gongcha Logo */}
              <View style={styles.headerLeftLogoContainer}>
                <Image
                  source={require('../../assets/images/GongchaLogo.png')}
                  style={styles.gongchaHeaderLogo}
                  resizeMode="contain"
                />
              </View>

              {/* RIGHT AREA: Greeting and Bell Button */}
              <View style={styles.headerRightContainer}>
                <View style={styles.headerGreetingTextContainer}>
                  <Text style={[styles.greeting, { color: 'rgba(255, 255, 255, 0.82)', textAlign: 'right' }]}>{getGreeting()},</Text>
                  {isMemberLoading ? (
                    <SkeletonLoader width={80} height={16} style={{ marginTop: 2, alignSelf: 'flex-end' }} />
                  ) : (
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                      style={[styles.name, { color: '#FFFFFF', textAlign: 'right' }]}
                    >
                      {formatMemberName(member?.fullName)}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.notificationBtn,
                    styles.notificationBtnShell,
                    {
                      width: headerIconSize,
                      height: headerIconSize,
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setShowNotifications(true)}
                >
                  <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
                  {notifications.some((n) => !n.isRead) && (
                    <View style={[styles.notificationBadge, { backgroundColor: '#FFFFFF', borderColor: colors.brand.primary }]}>
                      <Text style={[styles.notificationBadgeText, { color: colors.brand.primary }]}>
                        {notifications.filter((n) => !n.isRead).length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* MEMBERSHIP STATUS CARD INSIDE RED HEADER */}
            <View style={{ marginTop: 14 }}>
              <HomeMembershipRegion
                model={loyaltyModel}
                loading={isMemberLoading}
                onPress={() => navigation.navigate('MembershipStatus')}
              />
            </View>


          </Animated.View>

          {/* SCROLLABLE BENTO CONTENT (SLIDE-UP STAGGERED ENTRANCE) */}
          <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
              contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingBottom: 120 + insets.bottom, paddingTop: 16 }]}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#B91C2F']} tintColor="#B91C2F" />}
            >
              {/* NEWS AND PROMOTIONS */}



              <ScrollView
                ref={promoScrollRef}
                horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                style={styles.promoScroll} contentContainerStyle={{ paddingRight: 20 }}
                onMomentumScrollEnd={handlePromoScrollEnd}
                scrollEventThrottle={16}
              >
                {extendedPromos.map((promo, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('PromoDetail', {
                      imageUrl: promo.uri || undefined,
                      imageSource: promo.image || undefined,
                      title: promo.title,
                      subtitle: promo.subtitle || ''
                    })}
                    style={[styles.promoCard, { width: promoCardWidth, backgroundColor: colors.surface.card }]}
                  >
                    {promo.uri ? (
                      <Image source={{ uri: promo.uri }} style={styles.promoImage} resizeMode="cover" />
                    ) : promo.image ? (
                      <Image source={promo.image} style={styles.promoImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.promoPlaceholder, { backgroundColor: promo.color }]}>
                        <Text style={{ color: '#8C7B75', fontWeight: 'bold' }}>Promo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.paginationDots}>
                {promos.map((_, i) => <View key={i} style={[styles.dot, activePromo === i && { backgroundColor: colors.brand.primary, width: 24 }]} />)}
              </View>

              {/* TWO BENTO BOXES ROW (FEATURED DRINKS & NEARBY COMPASS STORE) */}
              <View style={styles.bentoGridRow}>
                <BentoFeaturedDrinks
                  onPress={() => navigation.navigate('Menu')}
                />
                <BentoNearbyOutlet
                  onPress={() => navigation.navigate('StoreLocator')}
                  stores={stores}
                />
              </View>

              {/* RECTANGULAR BENTO: DAILY CHECK-IN REWARD */}
              <BentoDailyCheckIn />
            </ScrollView>

          </Animated.View>


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
    </Animated.View>
  </ScreenFadeTransition>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  mainLayout: { flex: 1 },
  fixedHeaderContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },



  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, alignSelf: 'stretch' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  headerLeftLogoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  gongchaHeaderLogo: { width: 120, height: 35, tintColor: '#FFFFFF' },
  headerRightContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'flex-end' },
  headerGreetingTextContainer: { alignItems: 'flex-end', justifyContent: 'center', marginRight: 4 },
  greeting: { fontSize: 13, fontWeight: '500' },
  name: { fontSize: 18, fontWeight: 'bold' },
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
  paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 16, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0D6CC' },
  bentoGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
});

