import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { Trophy, Gift, ChevronRight, Bell, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import UserAvatar from '../components/UserAvatar';
import MockBackend from '../services/MockBackend';
import type { RootTabParamList } from '../navigation/AppNavigator';
import { MemberTier, UserProfile } from '../types/types';
import { getGreeting } from '../utils/greetingHelper';

const NOTIFICATIONS = [
  { id: '1', title: 'Selamat Ulang Tahun!', body: 'Voucher Birthday diskon 10% sudah aktif. Traktir dirimu sekarang!', time: 'Baru saja', read: false, type: 'gift' },
  { id: '2', title: 'Poin Masuk', body: 'Kamu mendapatkan 5.000 XP dari Admin Bonus. Level up semakin dekat!', time: '2 jam lalu', read: false, type: 'points' },
  { id: '3', title: 'Promo Brown Sugar', body: 'Beli 2 Brown Sugar Milk Tea, Gratis 1 Topping. Cek menu sekarang.', time: '1 hari lalu', read: true, type: 'promo' },
  { id: '4', title: 'Update Aplikasi', body: 'Fitur baru Store Locator sudah tersedia. Yuk update aplikasi Gong Cha kamu.', time: '3 hari lalu', read: true, type: 'system' },
];

const TIER_THEME: Record<MemberTier, any> = {
  Silver: {
    progressGradient: ['#B7C0CC', '#8A93A1'],
    tierBadgeBg: '#E5E7EB', tierText: '#4B5563', percentBadgeBg: '#6B7280',
    progressTrackBg: '#ECEFF3', rewardsBorder: '#E5E7EB', rewardsShadow: '#9CA3AF',
    footerIcon: '#6B7280', walletGradient: ['#5B6470', '#2F3742'],
    trophyBg: 'rgba(191, 199, 209, 0.92)', redeemAccent: '#4B5563',
  },
  Gold: {
    progressGradient: ['#D4A853', '#F3C677'],
    tierBadgeBg: '#D4A853', tierText: '#2A1F1F', percentBadgeBg: '#B91C2F',
    progressTrackBg: '#F0E6DA', rewardsBorder: '#F3E9DC', rewardsShadow: '#3A2E2A',
    footerIcon: '#B91C2F', walletGradient: ['#8E0E00', '#1F1C18'],
    trophyBg: 'rgba(212, 168, 83, 0.88)', redeemAccent: '#B91C2F',
  },
  Platinum: {
    progressGradient: ['#A78BFA', '#7C3AED'],
    tierBadgeBg: '#DDD6FE', tierText: '#5B21B6', percentBadgeBg: '#6D28D9',
    progressTrackBg: '#EDE9FE', rewardsBorder: '#E9D5FF', rewardsShadow: '#7C3AED',
    footerIcon: '#6D28D9', walletGradient: ['#4C1D95', '#111827'],
    trophyBg: 'rgba(196, 181, 253, 0.9)', redeemAccent: '#5B21B6',
  },
};

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const promoScrollRef = useRef<ScrollView | null>(null);
  const [activePromo, setActivePromo] = useState(0);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Animation Values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const buttonBg = useRef(new Animated.Value(0)).current;
  
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 360;
  const horizontalPadding = isCompact ? 16 : 20;
  const avatarSize = isCompact ? 46 : 52;
  const headerIconSize = isCompact ? 44 : 48;

  // --- BELL POSITIONING ---
  // Kita hitung posisi absolut bell agar bisa di-render di atas modal
  const bellTop = insets.top + 6 + 10; // marginTop + padding header
  const bellRight = 20 + 42 + 10; // paddingRight + logo width + gap

  // --- ANIMATIONS ---
  const openNotifications = () => {
    setShowNotifications(true);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 10, tension: 80 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, delay: 100, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.spring(iconRotate, { toValue: 1, useNativeDriver: true, friction: 8, tension: 100 }),
      Animated.timing(buttonBg, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  };

  const closeNotifications = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0, duration: 280, useNativeDriver: true, easing: Easing.in(Easing.back(1.2)) }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(iconRotate, { toValue: 0, useNativeDriver: true, friction: 8, tension: 100 }),
      Animated.timing(buttonBg, { toValue: 0, duration: 250, useNativeDriver: false }),
    ]).start(() => setShowNotifications(false));
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      const user = await MockBackend.getUser();
      setUserData(user);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(React.useCallback(() => { loadUserData(); }, []));

  const tierXp = userData?.tierXp ?? 0;
  const currentPoints = userData?.currentPoints ?? 0;
  const tier = userData?.tier ?? 'Silver';
  const tierTheme = TIER_THEME[tier];
  const target = tier === 'Silver' ? MockBackend.TIER_MILESTONES.Gold : tier === 'Gold' ? MockBackend.TIER_MILESTONES.Platinum : MockBackend.TIER_MILESTONES.Platinum;
  const isPlatinum = tier === 'Platinum';
  const progress = isPlatinum ? 100 : Math.max(0, Math.min((tierXp / target) * 100, 100));
  const remainingToNextTier = isPlatinum ? 0 : Math.max(0, target - tierXp);
  const footerMessage = isPlatinum ? 'You are Top Tier!' : `${remainingToNextTier} XP to reach next Tier!`;
  const promoCardWidth = width - 40;

  const promos = useMemo(() => [
    { color: '#FFD1DC', image: require('../../assets/images/promo1.webp') },
    { color: '#FFF5E1', image: null },
    { color: '#E0F7FA', image: null },
  ], []);

  useEffect(() => {
    if (!promos.length) return;
    const interval = setInterval(() => {
      setActivePromo((prev) => {
        const next = (prev + 1) % promos.length;
        promoScrollRef.current?.scrollTo({ x: next * promoCardWidth, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [promoCardWidth, promos.length]);

  // --- INTERPOLATIONS ---
  const iconRotation = iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const iconScale = iconRotate.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.8, 1] });
  const bellOpacity = iconRotate.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
  const xOpacity = iconRotate.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
  const buttonBackgroundColor = buttonBg.interpolate({ inputRange: [0, 1], outputRange: ['#FFFFFF', '#B91C2F'] });

  // Modal origin calculation (Relative to screen center)
  // We want modal to scale from the bell position
  const bellCenterX = width - horizontalPadding - 42 - 10 - (headerIconSize / 2);
  const bellCenterY = bellTop + (headerIconSize / 2);
  
  const modalTransform = [
    { translateX: bellCenterX - width / 2 },
    { translateY: bellCenterY - height / 2 },
    { 
      scale: scaleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.01, 1],
      }) 
    },
    { translateX: -(bellCenterX - width / 2) },
    { translateY: -(bellCenterY - height / 2) },
  ];

  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <DecorativeBackground />

        {/* --- MAIN CONTENT --- */}
        <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.scrollView} 
            contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingBottom: 120 + insets.bottom }]}
          >
            {/* HEADER (Text & Logo Only - Bell is rendered separately) */}
            <View style={styles.header}> 
              <View style={styles.headerLeft}>
                <View style={styles.avatarWrap}>
                  <UserAvatar name={userData?.name ?? 'Member'} photoURL={userData?.photoURL} size={avatarSize} />
                  <View style={styles.avatarStatusDot} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.greeting}>{getGreeting()},</Text>
                  <Text style={styles.name}>{userData?.name ?? 'Member'}</Text>
                </View>
              </View>
              {/* Placeholder untuk menjaga layout tetap rapi */}
              <View style={styles.headerRight}>
                <View style={{ width: headerIconSize, height: headerIconSize }} /> 
                <Image source={require('../../assets/images/logo1.webp')} style={styles.logoTopRight} resizeMode="contain" />
              </View>
            </View>

            {/* CARDS & CONTENT (Sama seperti sebelumnya) */}
            <View style={[styles.rewardsCard, { borderColor: tierTheme.rewardsBorder, shadowColor: tierTheme.rewardsShadow }]}>
              <View style={styles.rewardsHeader}>
                <View>
                  <Text style={styles.rewardsLabel}>MEMBERSHIP STATUS</Text>
                  <Text style={styles.rewardsPoints}>{loading ? 'Loading...' : `${tierXp} / ${target} XP`}</Text>
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
                <LinearGradient colors={tierTheme.progressGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.rewardsFooter}>
                <Gift size={14} color={tierTheme.footerIcon} />
                <Text style={styles.rewardsFooterText}>{loading ? 'Syncing rewards...' : footerMessage}</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View style={styles.redPill} />
              <Text style={styles.sectionTitle}>Special Offers</Text>
              <Image source={require('../../assets/images/boba.webp')} style={styles.titleIcon} />
            </View>

            <ScrollView ref={promoScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.promoScroll} contentContainerStyle={{ paddingRight: 20 }} onMomentumScrollEnd={(e) => setActivePromo(Math.round(e.nativeEvent.contentOffset.x / promoCardWidth))}>
              {promos.map((promo, idx) => (
                <View key={idx} style={[styles.promoCard, { width: promoCardWidth }]}> 
                  {promo.image ? <Image source={promo.image} style={styles.promoImage} resizeMode="cover" /> : <View style={[styles.promoPlaceholder, { backgroundColor: promo.color }]}><Text style={{color: '#8C7B75', fontWeight: 'bold'}}>Promo {idx+1}</Text></View>}
                </View>
              ))}
            </ScrollView>
            <View style={styles.paginationDots}>{promos.map((_, i) => <View key={i} style={[styles.dot, activePromo === i && styles.dotActive]} />)}</View>

            <View style={styles.sectionHeader}>
              <View style={styles.redPill} />
              <Text style={styles.walletTitle}>Gong Cha Wallet</Text>
            </View>

            <LinearGradient colors={tierTheme.walletGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletCard}>
              <Image source={require('../../assets/images/liquid.webp')} style={styles.walletLiquid} />
              <View style={styles.walletTopRow}>
                <View>
                  <Text style={styles.walletLabel}>Gong Cha Wallet</Text>
                  <Text style={styles.walletAmount}>{loading ? '...' : currentPoints.toLocaleString('id-ID')}</Text>
                </View>
                <View style={[styles.trophyIconBg, { backgroundColor: tierTheme.trophyBg }]}>
                  <Trophy size={21} color="#2A1F1F" />
                </View>
              </View>
              <View style={styles.walletDivider} />
              <View style={styles.walletBottomRow}>
                <View>
                  <Text style={styles.walletBenefitTitle}>Tier Benefits</Text>
                  <Text style={styles.walletBenefitDesc}>Free delivery & 10% Birthday Discount</Text>
                </View>
                <TouchableOpacity style={styles.redeemButton} onPress={() => navigation.navigate('Rewards')}>
                  <Text style={[styles.redeemButtonText, { color: tierTheme.redeemAccent }]}>Redeem Catalog</Text>
                  <ChevronRight size={11} color={tierTheme.redeemAccent} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </ScrollView>
        </View>

        {/* --- MODAL LAYER --- */}
        {/* Modal dirender DULUAN agar ada di bawah tombol lonceng (secara z-index) */}
        {/* TAPI, kita pakai Modal component native agar menutupi tab bar */}
        {/* TRICK: Karena Modal native selalu paling atas, kita tidak bisa menaruh tombol di atasnya secara langsung jika tombol itu bukan child dari Modal. */}
        {/* SOLUSI: Kita render tombol lonceng DI DALAM Modal juga saat modal aktif! */}
        
        <Modal
          visible={showNotifications}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={closeNotifications}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}>
            {Platform.OS === 'ios' ? <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />}
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeNotifications} activeOpacity={1} />
          </Animated.View>

          <Animated.View 
            style={[
              styles.modalContainer,
              {
                top: insets.top + 6 + headerIconSize + 20, 
                opacity: opacityAnim,
                transform: modalTransform,
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Notifications</Text>
                <Text style={styles.modalSubtitle}>You have 2 unread messages</Text>
              </View>
            </View>
            <View style={styles.notifListContainer}>
              <FlatList
                data={NOTIFICATIONS}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 20, paddingTop: 16 }}
                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.notifItem, !item.read && styles.notifItemUnread]} activeOpacity={0.7}>
                    <View style={[styles.notifIconCircle, { backgroundColor: !item.read ? '#B91C2F' : '#E5E7EB' }]}>
                      {item.type === 'gift' ? <Gift size={18} color={!item.read ? '#FFF' : '#6B7280'} /> : item.type === 'points' ? <Trophy size={18} color={!item.read ? '#FFF' : '#6B7280'} /> : <Bell size={18} color={!item.read ? '#FFF' : '#6B7280'} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.notifItemHeader}>
                        <Text style={[styles.notifItemTitle, !item.read && { color: '#2A1F1F', fontWeight: '700' }]}>{item.title}</Text>
                        <Text style={styles.notifTime}>{item.time}</Text>
                      </View>
                      <Text style={styles.notifBody}>{item.body}</Text>
                    </View>
                    {!item.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                )}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.markReadBtn} onPress={() => {}} activeOpacity={0.7}>
                <Text style={styles.markReadText}>Mark all as read</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* DUPLICATE BELL INSIDE MODAL (Agar tidak kena blur) */}
          <Animated.View
            style={[
              styles.notificationBtn,
              { 
                position: 'absolute',
                top: bellTop,
                right: bellRight,
                width: headerIconSize, 
                height: headerIconSize,
                backgroundColor: buttonBackgroundColor,
                zIndex: 9999, // Pastikan paling atas
                elevation: 10,
              }
            ]}
          >
             <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.8} onPress={closeNotifications}>
                <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', transform: [{ rotate: iconRotation }, { scale: iconScale }] }]}>
                   <Animated.View style={{ opacity: bellOpacity, position: 'absolute' }}><Bell size={22} color="#B91C2F" strokeWidth={2.5} /></Animated.View>
                   <Animated.View style={{ opacity: xOpacity, position: 'absolute' }}><X size={22} color="#FFF" strokeWidth={2.5} /></Animated.View>
                </Animated.View>
             </TouchableOpacity>
          </Animated.View>
        </Modal>

        {/* --- FLOATING BELL (VISIBLE WHEN MODAL CLOSED) --- */}
        {/* Render di luar ScrollView agar posisi absolute terhadap screen */}
        {!showNotifications && (
          <Animated.View
            style={[
              styles.notificationBtn,
              { 
                position: 'absolute',
                top: bellTop,
                right: bellRight,
                width: headerIconSize, 
                height: headerIconSize,
                backgroundColor: buttonBackgroundColor,
                zIndex: 100,
                elevation: 10,
              }
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={0.8}
              onPress={openNotifications}
              disabled={loading}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: [
                      { rotate: iconRotation },
                      { scale: iconScale },
                    ],
                  }
                ]}
              >
                <Animated.View style={{ opacity: bellOpacity, position: 'absolute' }}>
                  <Bell size={22} color="#B91C2F" strokeWidth={2.5} />
                </Animated.View>
                <Animated.View style={{ opacity: xOpacity, position: 'absolute' }}>
                  <X size={22} color="#FFF" strokeWidth={2.5} />
                </Animated.View>
              </Animated.View>
            </TouchableOpacity>
            
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>2</Text>
            </View>
          </Animated.View>
        )}

      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8F0', position: 'relative' },
  container: { flex: 1, backgroundColor: 'transparent', zIndex: 1 },
  scrollView: { flex: 1, zIndex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  // HEADER (Layout placeholder)
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, marginTop: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatarStatusDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, backgroundColor: '#4CAF50', borderRadius: 7, borderWidth: 2, borderColor: '#FFF' },
  greeting: { fontSize: 13, color: '#8C7B75', fontWeight: '500' },
  headerTextContainer: { justifyContent: 'center' },
  name: { fontSize: 19, fontWeight: 'bold', color: '#2A1F1F' },
  
  // FLOATING BELL
  notificationBtn: { 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#B91C2F', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 12, 
    elevation: 6,
  },
  notificationBadge: { 
    position: 'absolute', 
    top: 8, 
    right: 10, 
    minWidth: 18, 
    height: 18, 
    backgroundColor: '#B91C2F', 
    borderRadius: 9, 
    borderWidth: 2, 
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  logoTopRight: { width: 42, height: 42 },

  // MODAL
  modalContainer: {
    position: 'absolute', left: 10, right: 10, bottom: 20,
    backgroundColor: '#FFF', borderRadius: 32, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 30, elevation: 20, maxHeight: '75%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#2A1F1F', marginBottom: 2 },
  modalSubtitle: { fontSize: 14, color: '#8C7B75' },
  notifListContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  notifItem: { flexDirection: 'row', padding: 16, borderRadius: 20, backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, alignItems: 'flex-start' },
  notifItemUnread: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#FEE2E2', shadowColor: '#B91C2F', shadowOpacity: 0.1 },
  notifIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14, flexShrink: 0 },
  notifItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  notifItemTitle: { fontSize: 15, fontWeight: '600', color: '#4B5563', flex: 1, marginRight: 8 },
  notifTime: { fontSize: 11, color: '#9CA3AF', flexShrink: 0 },
  notifBody: { fontSize: 13, color: '#6B7280', lineHeight: 18, paddingRight: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#B91C2F', marginLeft: 8, marginTop: 6, flexShrink: 0 },
  modalFooter: { borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFF' },
  markReadBtn: { padding: 18, alignItems: 'center' },
  markReadText: { color: '#B91C2F', fontWeight: 'bold', fontSize: 15 },

  // OTHER CARDS (unchanged)
  rewardsCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F3E9DC', elevation: 3 },
  rewardsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 },
  rewardsLabel: { fontSize: 10, color: '#8C7B75', fontWeight: 'bold', letterSpacing: 0.8, marginBottom: 2 },
  rewardsPoints: { fontSize: 16, fontWeight: 'bold', color: '#2A1F1F' },
  tierBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, marginBottom: 3 },
  tierText: { fontSize: 9, fontWeight: 'bold' },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-end' },
  percentText: { color: '#FFF', fontWeight: 'bold', fontSize: 10 },
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', borderRadius: 3 },
  rewardsFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardsFooterText: { fontSize: 9, color: '#8C7B75', fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  redPill: { width: 4, height: 24, backgroundColor: '#B91C2F', borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A1F1F' },
  titleIcon: { width: 24, height: 24, marginLeft: 8, opacity: 0.8 },
  promoScroll: { marginBottom: 10 },
  promoCard: { height: 180, borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFF', elevation: 5 },
  promoImage: { width: '100%', height: '100%' },
  promoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0D6CC' },
  dotActive: { backgroundColor: '#B91C2F', width: 24 },
  walletTitle: { fontSize: 18, fontWeight: 'bold', color: '#2A1F1F' },
  walletCard: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 13, position: 'relative', overflow: 'hidden', elevation: 5 },
  walletLiquid: { position: 'absolute', right: -18, bottom: -28, width: 98, height: 146, opacity: 0.28, transform: [{ rotate: '-10deg' }] },
  walletTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 3 },
  walletAmount: { color: '#FFF', fontSize: 26, fontWeight: 'bold', letterSpacing: 0.4 },
  trophyIconBg: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  walletDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 10 },
  walletBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  walletBenefitTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  walletBenefitDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 2, maxWidth: 170 },
  redeemButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, gap: 4, elevation: 2 },
  redeemButtonText: { fontWeight: 'bold', fontSize: 10 },
});