import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { Trophy, Gift, ChevronRight, Bell } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import MockBackend from '../services/MockBackend';
import { MemberTier, UserProfile } from '../types/types';

const resolveTier = (tierXp: number): MemberTier => {
  if (tierXp >= MockBackend.TIER_MILESTONES.Platinum) return 'Platinum';
  if (tierXp >= MockBackend.TIER_MILESTONES.Gold) return 'Gold';
  return 'Silver';
};

const TIER_THEME: Record<
  MemberTier,
  {
    progressGradient: [string, string];
    tierBadgeBg: string;
    tierText: string;
    percentBadgeBg: string;
    progressTrackBg: string;
    rewardsBorder: string;
    rewardsShadow: string;
    footerIcon: string;
    walletGradient: [string, string];
    trophyBg: string;
    redeemAccent: string;
  }
> = {
  Silver: {
    progressGradient: ['#B7C0CC', '#8A93A1'],
    tierBadgeBg: '#E5E7EB',
    tierText: '#4B5563',
    percentBadgeBg: '#6B7280',
    progressTrackBg: '#ECEFF3',
    rewardsBorder: '#E5E7EB',
    rewardsShadow: '#9CA3AF',
    footerIcon: '#6B7280',
    walletGradient: ['#5B6470', '#2F3742'],
    trophyBg: 'rgba(191, 199, 209, 0.92)',
    redeemAccent: '#4B5563',
  },
  Gold: {
    progressGradient: ['#D4A853', '#F3C677'],
    tierBadgeBg: '#D4A853',
    tierText: '#2A1F1F',
    percentBadgeBg: '#B91C2F',
    progressTrackBg: '#F0E6DA',
    rewardsBorder: '#F3E9DC',
    rewardsShadow: '#3A2E2A',
    footerIcon: '#B91C2F',
    walletGradient: ['#8E0E00', '#1F1C18'],
    trophyBg: 'rgba(212, 168, 83, 0.88)',
    redeemAccent: '#B91C2F',
  },
  Platinum: {
    progressGradient: ['#A78BFA', '#7C3AED'],
    tierBadgeBg: '#DDD6FE',
    tierText: '#5B21B6',
    percentBadgeBg: '#6D28D9',
    progressTrackBg: '#EDE9FE',
    rewardsBorder: '#E9D5FF',
    rewardsShadow: '#7C3AED',
    footerIcon: '#6D28D9',
    walletGradient: ['#4C1D95', '#111827'],
    trophyBg: 'rgba(196, 181, 253, 0.9)',
    redeemAccent: '#5B21B6',
  },
};

export default function HomeScreen() {
  const [activePromo, setActivePromo] = useState(0);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEarning, setIsEarning] = useState(false);
  const { width } = useWindowDimensions();

  const loadUserData = async () => {
    setLoading(true);
    try {
      const user = await MockBackend.initUser('8123456789');
      setUserData(user);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      setLoading(true);
      try {
        const user = await MockBackend.initUser('8123456789');
        if (mounted) setUserData(user);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const tierXp = userData?.tierXp ?? 0;
  const currentPoints = userData?.currentPoints ?? 0;
  const tier = userData?.tier ?? 'Silver';
  const tierTheme = TIER_THEME[tier];

  const getNextTierTarget = (currentTier: MemberTier) => {
    if (currentTier === 'Silver') return MockBackend.TIER_MILESTONES.Gold;
    if (currentTier === 'Gold') return MockBackend.TIER_MILESTONES.Platinum;
    return MockBackend.TIER_MILESTONES.Platinum;
  };

  const target = getNextTierTarget(tier);
  const isPlatinum = tier === 'Platinum';
  const progress = isPlatinum ? 100 : Math.max(0, Math.min((tierXp / target) * 100, 100));

  const remainingToNextTier = isPlatinum ? 0 : Math.max(0, target - tierXp);

  const footerMessage =
    isPlatinum
      ? 'You are Top Tier!'
      : `${remainingToNextTier} XP to reach next Tier!`;

  const promoCardWidth = width - 40;

  const handleDebugEarnPoints = async () => {
    if (isEarning || !userData) return;

    setIsEarning(true);

    const pointsEarned = Math.floor(50000 / MockBackend.POINT_CONVERSION);
    const optimisticTierXp = userData.tierXp + pointsEarned;
    const optimisticUser: UserProfile = {
      ...userData,
      currentPoints: userData.currentPoints + pointsEarned,
      tierXp: optimisticTierXp,
      xpHistory: [
        {
          id: `xp_optimistic_${Date.now()}`,
          date: new Date().toISOString(),
          amount: pointsEarned,
        },
        ...(userData.xpHistory || []),
      ],
      tier: resolveTier(optimisticTierXp),
    };

    setUserData(optimisticUser);

    try {
      const updatedUser = await MockBackend.addTransaction(50000);
      setUserData(updatedUser);
    } catch {
      setUserData(userData);
    } finally {
      setIsEarning(false);
    }
  };

  const promos = useMemo(
    () => [
      { color: '#FFD1DC', image: require('../../assets/images/promo1.png') },
      { color: '#FFF5E1', image: null },
      { color: '#E0F7FA', image: null },
    ],
    []
  );

  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <DecorativeBackground />

      <SafeAreaView style={styles.container}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
        >
          
          {/* --- 1. HEADER --- */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarWrap}>
                <Image source={require('../../assets/images/avatar1.jpeg')} style={styles.avatar} />
                <View style={styles.avatarStatusDot} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.greeting}>Good Morning,</Text>
                <Text style={styles.name}>{userData?.name ?? 'Member'}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.notificationBtn}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={handleDebugEarnPoints}
                disabled={loading || isEarning}
              >
                <Bell size={22} color="#B91C2F" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
              <Image source={require('../../assets/images/logo1.png')} style={styles.logoTopRight} resizeMode="contain" accessibilityLabel="Gong Cha logo" />
            </View>
          </View>

          {/* --- 2. MEMBERSHIP STATUS CARD (SWAPPED TO TOP) --- */}
          {/* Posisi ditukar ke atas sesuai referensi */}
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

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, { backgroundColor: tierTheme.progressTrackBg }]}>
              <LinearGradient
                colors={tierTheme.progressGradient}
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress}%` }]} 
              />
            </View>

            <View style={styles.rewardsFooter}>
              <Gift size={16} color={tierTheme.footerIcon} />
              <Text style={styles.rewardsFooterText}>{loading ? 'Syncing rewards...' : footerMessage}</Text>
            </View>
          </View>

          {/* --- 3. SPECIAL OFFERS (PROMO) --- */}
          <View style={styles.sectionHeader}>
            <View style={styles.redPill} />
            <Text style={styles.sectionTitle}>Special Offers</Text>
            {/* Hiasan boba kecil di judul */}
            <Image source={require('../../assets/images/boba.png')} style={styles.titleIcon} />
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.promoScroll}
            contentContainerStyle={{ paddingRight: 20 }} // Biar kartu terakhir ga mentok
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / promoCardWidth);
              setActivePromo(index);
            }}
          >
            {promos.map((promo, idx) => (
              <View key={idx} style={[styles.promoCard, { width: promoCardWidth }]}> 
                 {/* Width - 40 agar ada margin kiri kanan */}
                {promo.image ? (
                  <Image source={promo.image} style={styles.promoImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.promoPlaceholder, { backgroundColor: promo.color }]}>
                     <Text style={{color: '#8C7B75', fontWeight: 'bold'}}>Promo {idx+1}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Pagination Dots */}
          <View style={styles.paginationDots}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, activePromo === i && styles.dotActive]} />
            ))}
          </View>

          {/* --- 4. GONG CHA WALLET --- */}
          <View style={styles.sectionHeader}>
            <View style={styles.redPill} />
            <Text style={styles.walletTitle}>Gong Cha Wallet</Text>
          </View>

          {/* FIXED: GRADIENT YANG LEBIH MEWAH & GELAP */}
          <LinearGradient 
            colors={tierTheme.walletGradient}
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={styles.walletCard}
          >
            {/* Dekorasi Liquid di dalam Wallet */}
            <Image source={require('../../assets/images/liquid.png')} style={styles.walletLiquid} />

            <View style={styles.walletTopRow}>
              <View>
                <Text style={styles.walletLabel}>Gong Cha Wallet</Text>
                <Text style={styles.walletAmount}>{loading ? '...' : currentPoints.toLocaleString('id-ID')}</Text>
              </View>
              <View style={[styles.trophyIconBg, { backgroundColor: tierTheme.trophyBg }]}>
                <Trophy size={24} color="#2A1F1F" />
              </View>
            </View>

            <View style={styles.walletDivider} />

            <View style={styles.walletBottomRow}>
              <View>
                <Text style={styles.walletBenefitTitle}>Tier Benefits</Text>
                <Text style={styles.walletBenefitDesc}>Free delivery & 10% Birthday Discount</Text>
              </View>
              <TouchableOpacity style={styles.redeemButton} accessibilityRole="button" accessibilityLabel="Redeem Catalog">
                <Text style={[styles.redeemButtonText, { color: tierTheme.redeemAccent }]}>Redeem Catalog</Text>
                <ChevronRight size={12} color={tierTheme.redeemAccent} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

        </ScrollView>
      </SafeAreaView>
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F0', // Cream Base
    position: 'relative',
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Space untuk Bottom Nav
  },

  // --- HEADER ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#B91C2F',
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  greeting: {
    fontSize: 13,
    color: '#8C7B75',
    fontWeight: '500',
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#2A1F1F',
  },
  notificationBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    backgroundColor: '#B91C2F',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  logoTopRight: {
    width: 42,
    height: 42,
  },

  // --- REWARDS CARD (TOP) ---
  rewardsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#3A2E2A',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3E9DC',
  },
  rewardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  rewardsLabel: {
    fontSize: 11,
    color: '#8C7B75',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  rewardsPoints: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2A1F1F',
  },
  tierBadge: {
    backgroundColor: '#D4A853',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2A1F1F',
  },
  percentBadge: {
    backgroundColor: '#B91C2F',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  percentText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#F0E6DA',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  rewardsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardsFooterText: {
    fontSize: 12,
    color: '#8C7B75',
    fontWeight: '500',
  },

  // --- SPECIAL OFFERS ---
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  redPill: {
    width: 4,
    height: 24,
    backgroundColor: '#B91C2F',
    borderRadius: 2,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A1F1F',
  },
  titleIcon: {
    width: 24,
    height: 24,
    marginLeft: 8,
    opacity: 0.8,
  },
  promoScroll: {
    marginBottom: 10,
  },
  promoCard: {
    height: 180,
    borderRadius: 24,
    marginRight: 0, // Dihandle parent padding
    overflow: 'hidden',
    shadowColor: '#3A2E2A',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.11,
    shadowRadius: 14,
    elevation: 5,
    backgroundColor: '#FFF',
  },
  promoImage: {
    width: '100%',
    height: '100%',
  },
  promoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0D6CC',
  },
  dotActive: {
    backgroundColor: '#B91C2F',
    width: 24,
  },

  // --- GONG CHA WALLET ---
  walletTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2A1F1F',
  },
  walletCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  walletLiquid: {
    position: 'absolute',
    right: -18,
    bottom: -34,
    width: 108,
    height: 160,
    opacity: 0.28,
    transform: [{ rotate: '-10deg' }],
  },
  walletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  walletAmount: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  trophyIconBg: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(212, 168, 83, 0.88)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 14,
  },
  walletBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  walletBenefitTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  walletBenefitDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 2,
    maxWidth: 180,
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  redeemButtonText: {
    color: '#B91C2F',
    fontWeight: 'bold',
    fontSize: 11,
  },
});