import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Easing, Image, View, Text, ScrollView, StyleSheet, TouchableOpacity,
  useWindowDimensions, RefreshControl,
} from 'react-native';
import {
  ChevronLeft, Trophy, Clock, CheckCircle, XCircle, Zap, Star, Gift,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useMember } from '../context/MemberContext';
import { colors } from '../theme/colorTokens';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { XpHistoryEntry } from '../types/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tier = 'Silver' | 'Gold' | 'Platinum';

interface TierConfig {
  gradient: [string, string];
  heroBg: [string, string];
  next: string | null;
  target: number;
  accentColor: string;
  benefits: Array<{ icon: React.ComponentType<{ size?: number; color?: string }>; label: string }>;
  multiplier: string;
}

const TIER_CONFIG: Record<Tier, TierConfig> = {
  Silver: {
    gradient: ['#B7C0CC', '#8A93A1'],
    heroBg: ['#F0F3F7', '#E2E8F0'],
    next: 'Gold',
    target: 5000,
    accentColor: '#6B7280',
    benefits: [
      { icon: Zap, label: '1× poin per pembelian' },
      { icon: Gift, label: 'Akses katalog reward' },
      { icon: Star, label: 'Tukar voucher eksklusif' },
    ],
    multiplier: '1×',
  },
  Gold: {
    gradient: ['#D4A853', '#F3C677'],
    heroBg: ['#FBF3E3', '#F5E9CC'],
    next: 'Platinum',
    target: 15000,
    accentColor: '#B45309',
    benefits: [
      { icon: Zap, label: '1.25× poin per pembelian' },
      { icon: Gift, label: 'Voucher ulang tahun eksklusif' },
      { icon: Star, label: 'Early access menu baru' },
    ],
    multiplier: '1.25×',
  },
  Platinum: {
    gradient: ['#A78BFA', '#7C3AED'],
    heroBg: ['#EDE9FE', '#DDD6FE'],
    next: null,
    target: 15000,
    accentColor: '#5B21B6',
    benefits: [
      { icon: Zap, label: '1.5× poin per pembelian' },
      { icon: Gift, label: 'Reward eksklusif Platinum' },
      { icon: Star, label: 'Priority customer support' },
    ],
    multiplier: '1.5×',
  },
};

function toMs(entry: XpHistoryEntry): number {
  const raw = entry.createdAt ?? entry.date;
  if (!raw) return 0;
  if (raw?.toDate) return raw.toDate().getTime();
  return new Date(raw).getTime();
}

function formatEntryDate(entry: XpHistoryEntry): string {
  const ms = toMs(entry);
  if (!ms) return '';
  const diff = (Date.now() - ms) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}h lalu`;
  return new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function EntryStatusIcon({ entry }: { entry: XpHistoryEntry }) {
  if (entry.type === 'redeem') return <XCircle size={16} color="#B91C2F" />;
  if (entry.status === 'verified') return <CheckCircle size={16} color="#15803D" />;
  if (entry.status === 'rejected') return <XCircle size={16} color="#B91C2F" />;
  return <Clock size={16} color="#B45309" />;
}

function entryAmountColor(entry: XpHistoryEntry): string {
  if (entry.type === 'redeem') return '#B91C2F';
  if (entry.status === 'rejected') return '#9CA3AF';
  if (entry.status === 'pending') return '#B45309';
  return '#15803D';
}

export default function MembershipStatusScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { member } = useMember();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 72,
        useNativeDriver: true,
      }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tier = (member?.tier ?? 'Silver') as Tier;
  const cfg = TIER_CONFIG[tier];
  const tierXp = member?.tierXp ?? 0;
  const currentPoints = member?.currentPoints ?? member?.points ?? 0;
  const pendingPoints = member?.pendingPoints ?? 0;
  const lifetimePoints = member?.lifetimePoints ?? 0;
  const isPlatinum = tier === 'Platinum';
  const progressPct = isPlatinum ? 100 : Math.max(0, Math.min((tierXp / cfg.target) * 100, 100));
  const remaining = isPlatinum ? 0 : Math.max(0, cfg.target - tierXp);

  const sortedHistory = useMemo(() => {
    const hist = member?.xpHistory ?? [];
    return [...hist].sort((a, b) => toMs(b) - toMs(a)).slice(0, 30);
  }, [member?.xpHistory]);

  const horizontalPadding = width < 360 ? 16 : 20;

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: horizontalPadding }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ChevronLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Membership</Text>
        <Image
          source={require('../../assets/images/logo1.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + 32 }]}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#B91C2F']} tintColor="#B91C2F" />}
      >
          {/* HERO CARD */}
          <LinearGradient
            colors={cfg.heroBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Tier badge row */}
            <View style={styles.heroBadgeRow}>
              <View style={[styles.tierIconWrap, { backgroundColor: cfg.accentColor + '18' }]}>
                <Trophy size={18} color={cfg.accentColor} />
              </View>
              <View style={[styles.tierBadge, { backgroundColor: cfg.accentColor }]}>
                <Text style={styles.tierBadgeText}>{tier}</Text>
              </View>
            </View>

            {/* XP label */}
            <Text style={styles.heroXpLabel}>Total XP</Text>
            <Text style={[styles.heroXpValue, { color: cfg.accentColor }]}>
              {tierXp.toLocaleString('id-ID')}
            </Text>

            {/* Progress bar */}
            <View style={styles.progressBg}>
              <LinearGradient
                colors={cfg.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progressPct}%` }]}
              />
            </View>

            {/* Progress info */}
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressCurrent}>
                {tierXp.toLocaleString('id-ID')} XP
              </Text>
              <Text style={styles.progressTarget}>
                {cfg.target.toLocaleString('id-ID')} XP
              </Text>
            </View>

            {isPlatinum ? (
              <Text style={[styles.nextTierLabel, { color: cfg.accentColor }]}>
                Tier tertinggi — Selamat!
              </Text>
            ) : (
              <Text style={styles.nextTierLabel}>
                <Text style={{ fontWeight: '800', color: cfg.accentColor }}>
                  {remaining.toLocaleString('id-ID')} XP
                </Text>
                {' lagi untuk mencapai '}
                <Text style={{ fontWeight: '800' }}>{cfg.next}</Text>
              </Text>
            )}
          </LinearGradient>

          {/* STATS ROW */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface.card }]}>
              <Text style={styles.statValue}>{currentPoints.toLocaleString('id-ID')}</Text>
              <Text style={styles.statLabel}>Poin Tersedia</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface.card }]}>
              <Text style={[styles.statValue, pendingPoints > 0 && { color: '#B45309' }]}>
                {pendingPoints.toLocaleString('id-ID')}
              </Text>
              <Text style={styles.statLabel}>Poin Pending</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface.card }]}>
              <Text style={styles.statValue}>{lifetimePoints.toLocaleString('id-ID')}</Text>
              <Text style={styles.statLabel}>Lifetime</Text>
            </View>
          </View>

          {/* TIER BENEFITS */}
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Benefit {tier}</Text>
              <View style={[styles.multiplierChip, { backgroundColor: cfg.accentColor + '18' }]}>
                <Text style={[styles.multiplierText, { color: cfg.accentColor }]}>
                  {cfg.multiplier} earn
                </Text>
              </View>
            </View>
            {cfg.benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <View key={i} style={styles.benefitRow}>
                  <View style={[styles.benefitIconWrap, { backgroundColor: cfg.accentColor + '14' }]}>
                    <Icon size={15} color={cfg.accentColor} />
                  </View>
                  <Text style={styles.benefitLabel}>{b.label}</Text>
                </View>
              );
            })}
            {!isPlatinum && (
              <View style={[styles.nextTierHint, { borderColor: cfg.accentColor + '30' }]}>
                <Text style={styles.nextTierHintText}>
                  Naik ke{' '}
                  <Text style={{ fontWeight: '700', color: cfg.accentColor }}>{cfg.next}</Text>
                  {' '}untuk unlock multiplier lebih tinggi & reward eksklusif.
                </Text>
              </View>
            )}
          </View>

          {/* XP ACTIVITY */}
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.card }]}>
            <Text style={styles.sectionTitle}>Riwayat XP</Text>

            {sortedHistory.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Trophy size={28} color={colors.text.tertiary} />
                <Text style={styles.emptyHistoryText}>
                  Belum ada riwayat. Mulai bertransaksi untuk mengumpulkan XP.
                </Text>
              </View>
            ) : (
              sortedHistory.map((entry, i) => (
                <View key={entry.id ?? i} style={[styles.historyItem, i > 0 && styles.historyItemBorder]}>
                  <View style={styles.historyLeft}>
                    <EntryStatusIcon entry={entry} />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyContext} numberOfLines={1}>
                      {entry.context ?? entry.location ?? (entry.type === 'redeem' ? 'Tukar poin' : 'Transaksi')}
                    </Text>
                    {entry.location && entry.context && (
                      <Text style={styles.historyLocation} numberOfLines={1}>{entry.location}</Text>
                    )}
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[styles.historyAmount, { color: entryAmountColor(entry) }]}>
                      {entry.type === 'redeem' ? '−' : '+'}{Math.abs(entry.amount).toLocaleString('id-ID')} XP
                    </Text>
                    <Text style={styles.historyDate}>{formatEntryDate(entry)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF1EA',
    borderWidth: 1,
    borderColor: '#F1DED4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  scrollContent: {
    paddingTop: 4,
    gap: 14,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroXpLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  heroXpValue: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 48,
  },
  progressBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCurrent: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  progressTarget: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  nextTierLabel: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionCard: {
    borderRadius: 22,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
  },
  multiplierChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  multiplierText: {
    fontSize: 11,
    fontWeight: '700',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    flex: 1,
  },
  nextTierHint: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 2,
  },
  nextTierHintText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.text.secondary,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  emptyHistoryText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  historyItemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  historyLeft: {
    paddingTop: 2,
    flexShrink: 0,
  },
  historyContent: {
    flex: 1,
    gap: 2,
  },
  historyContext: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 18,
  },
  historyLocation: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  historyDate: {
    fontSize: 10,
    color: colors.text.tertiary,
  },
});
