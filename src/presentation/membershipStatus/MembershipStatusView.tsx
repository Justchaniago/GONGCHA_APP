import React, { useEffect, useRef } from 'react';
import {
  Animated, Easing, Image, View, Text, ScrollView, StyleSheet, TouchableOpacity,
  useWindowDimensions, RefreshControl,
} from 'react-native';
import {
  ChevronLeft, Trophy, Clock, CheckCircle, XCircle, Zap, Star, Gift,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import type {
  MembershipActivityViewModel,
  MembershipBenefitIcon,
  MembershipStatusViewModel,
  MembershipThemeKey,
} from '../../application/membershipStatus/MembershipStatusViewModel';
import { colors } from '../../theme/colorTokens';

interface ThemeConfig {
  gradient: [string, string];
  heroBg: [string, string];
  accentColor: string;
}

const TIER_THEME: Record<MembershipThemeKey, ThemeConfig> = {
  'legacy-silver': {
    gradient: ['#B7C0CC', '#8A93A1'],
    heroBg: ['#F0F3F7', '#E2E8F0'],
    accentColor: '#6B7280',
  },
  'legacy-gold': {
    gradient: ['#D4A853', '#F3C677'],
    heroBg: ['#FBF3E3', '#F5E9CC'],
    accentColor: '#B45309',
  },
  'legacy-platinum': {
    gradient: ['#A78BFA', '#7C3AED'],
    heroBg: ['#EDE9FE', '#DDD6FE'],
    accentColor: '#5B21B6',
  },
  'candidate-lover': {
    gradient: ['#F43F5E', '#BE123C'],
    heroBg: ['#FFF1F2', '#FFE4E6'],
    accentColor: '#C8102E',
  },
  'candidate-master': {
    gradient: ['#D1D5DB', '#6B7280'],
    heroBg: ['#F9FAFB', '#E5E7EB'],
    accentColor: '#4B5563',
  },
  'candidate-ambassador': {
    gradient: ['#FACC15', '#B45309'],
    heroBg: ['#FFFBEB', '#FEF3C7'],
    accentColor: '#B45309',
  },
  'candidate-legend': {
    gradient: ['#374151', '#030712'],
    heroBg: ['#F3F4F6', '#D1D5DB'],
    accentColor: '#111827',
  },
};

const BENEFIT_ICON = {
  zap: Zap,
  gift: Gift,
  star: Star,
} satisfies Record<
  MembershipBenefitIcon,
  React.ComponentType<{ size?: number; color?: string }>
>;

function EntryStatusIcon({
  entry,
}: {
  entry: MembershipActivityViewModel;
}) {
  if (entry.status === 'redeem') {
    return <XCircle size={16} color="#B91C2F" />;
  }
  if (entry.status === 'verified') {
    return <CheckCircle size={16} color="#15803D" />;
  }
  if (entry.status === 'rejected') {
    return <XCircle size={16} color="#B91C2F" />;
  }
  return <Clock size={16} color="#B45309" />;
}

function entryAmountColor(entry: MembershipActivityViewModel): string {
  if (entry.status === 'redeem') return '#B91C2F';
  if (entry.status === 'rejected') return '#9CA3AF';
  if (entry.status === 'pending') return '#B45309';
  return '#15803D';
}

interface MembershipStatusViewProps {
  model: MembershipStatusViewModel;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onActivityPress?: () => void;
}

export default function MembershipStatusView({
  model,
  refreshing,
  onRefresh,
  onBack,
  onActivityPress,
}: MembershipStatusViewProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

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

  const cfg = TIER_THEME[model.theme];
  const horizontalPadding = width < 360 ? 16 : 20;

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingHorizontal: horizontalPadding }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <ChevronLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Membership</Text>
        <Image
          source={require('../../../assets/images/logo1.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding, paddingBottom: insets.bottom + 32 }]}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#B91C2F']} tintColor="#B91C2F" />}
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
                <Text style={styles.tierBadgeText}>{model.tierDisplayName}</Text>
              </View>
            </View>

            {/* XP label */}
            <Text style={styles.heroXpLabel}>{model.totalLabel}</Text>
            <Text style={[styles.heroXpValue, { color: cfg.accentColor }]}>
              {model.totalValueLabel}
            </Text>

            {/* Progress bar */}
            <View style={styles.progressBg}>
              <LinearGradient
                colors={cfg.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${model.progressPercent}%` }]}
              />
            </View>

            {/* Progress info */}
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressCurrent}>
                {model.progressCurrentLabel}
              </Text>
              <Text style={styles.progressTarget}>
                {model.progressTargetLabel}
              </Text>
            </View>

            {model.progressMessage.terminal ? (
              <Text style={[styles.nextTierLabel, { color: cfg.accentColor }]}>
                {model.progressMessage.emphasis}
                {model.progressMessage.suffix}
              </Text>
            ) : (
              <Text style={styles.nextTierLabel}>
                <Text style={{ fontWeight: '800', color: cfg.accentColor }}>
                  {model.progressMessage.emphasis}
                </Text>
                {model.progressMessage.suffix}
              </Text>
            )}
          </LinearGradient>

          {/* STATS ROW */}
          <View style={styles.statsRow}>
            {model.stats.map((stat) => (
              <View
                key={stat.label}
                style={[
                  styles.statCard,
                  { backgroundColor: colors.surface.card },
                ]}
              >
                <Text
                  style={[
                    styles.statValue,
                    stat.tone === 'pending' && { color: '#B45309' },
                  ]}
                >
                  {stat.valueLabel}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* TIER BENEFITS */}
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{model.benefitsTitle}</Text>
              {model.multiplierLabel ? (
                <View style={[styles.multiplierChip, { backgroundColor: cfg.accentColor + '18' }]}>
                  <Text style={[styles.multiplierText, { color: cfg.accentColor }]}>
                    {model.multiplierLabel}
                  </Text>
                </View>
              ) : null}
            </View>
            {model.benefits.map((benefit) => {
              const Icon = BENEFIT_ICON[benefit.icon];
              return (
                <View key={benefit.label} style={styles.benefitRow}>
                  <View style={[styles.benefitIconWrap, { backgroundColor: cfg.accentColor + '14' }]}>
                    <Icon size={15} color={cfg.accentColor} />
                  </View>
                  <Text style={styles.benefitLabel}>{benefit.label}</Text>
                </View>
              );
            })}
            {model.benefitsNotice ? (
              <View style={[styles.nextTierHint, { borderColor: cfg.accentColor + '30' }]}>
                <Text style={styles.nextTierHintText}>
                  {model.benefitsNotice}
                </Text>
              </View>
            ) : null}
            {model.nextTierHint ? (
              <View style={[styles.nextTierHint, { borderColor: cfg.accentColor + '30' }]}>
                <Text style={styles.nextTierHintText}>
                  {model.nextTierHint}
                </Text>
              </View>
            ) : null}
          </View>

          {/* XP ACTIVITY */}
          <View style={[styles.sectionCard, { backgroundColor: colors.surface.card }]}>
            <Text style={styles.sectionTitle}>{model.activity.title}</Text>

            {model.activity.kind === 'link' ? (
              <View style={styles.emptyHistory}>
                <Trophy size={28} color={colors.text.tertiary} />
                <Text style={styles.emptyHistoryText}>
                  {model.activity.message}
                </Text>
                <TouchableOpacity
                  style={styles.activityButton}
                  onPress={onActivityPress}
                  disabled={!onActivityPress}
                >
                  <Text style={styles.activityButtonText}>
                    {model.activity.actionLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : model.activity.items.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Trophy size={28} color={colors.text.tertiary} />
                <Text style={styles.emptyHistoryText}>
                  {model.activity.emptyMessage}
                </Text>
              </View>
            ) : (
              model.activity.items.map((entry, i) => (
                <View key={entry.id} style={[styles.historyItem, i > 0 && styles.historyItemBorder]}>
                  <View style={styles.historyLeft}>
                    <EntryStatusIcon entry={entry} />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={styles.historyContext} numberOfLines={1}>
                      {entry.context}
                    </Text>
                    {entry.location ? (
                      <Text style={styles.historyLocation} numberOfLines={1}>{entry.location}</Text>
                    ) : null}
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[styles.historyAmount, { color: entryAmountColor(entry) }]}>
                      {entry.amountLabel}
                    </Text>
                    <Text style={styles.historyDate}>{entry.dateLabel}</Text>
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
  activityButton: {
    backgroundColor: '#B91C2F',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  activityButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
