import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronRight, Gift, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type {
  HomeLoyaltyThemeKey,
  HomeLoyaltyViewModel,
} from '../../application/homeLoyalty/HomeLoyaltyViewModel';
import SkeletonLoader from '../../components/SkeletonLoader';
import { colors } from '../../theme/colorTokens';

interface Theme {
  progressGradient: readonly [string, string];
  tierBadgeBg: string;
  tierText: string;
  percentBadgeBg: string;
  progressTrackBg: string;
  rewardsBorder: string;
  rewardsShadow: string;
  footerIcon: string;
  walletGradient: readonly [string, string];
  trophyBg: string;
  actionAccent: string;
}


const THEMES: Record<HomeLoyaltyThemeKey, Theme> = {
  'legacy-silver': {
    progressGradient: ['#B7C0CC', '#8A93A1'],
    tierBadgeBg: '#E5E7EB',
    tierText: '#4B5563',
    percentBadgeBg: '#6B7280',
    progressTrackBg: '#ECEFF3',
    rewardsBorder: '#CBD5E1',
    rewardsShadow: '#94A3B8',
    footerIcon: '#6B7280',
    walletGradient: ['#5B6470', '#2F3742'],
    trophyBg: 'rgba(191, 199, 209, 0.92)',
    actionAccent: '#4B5563',
  },
  'legacy-gold': {
    progressGradient: ['#D4A853', '#F3C677'],
    tierBadgeBg: '#D4A853',
    tierText: '#2A1F1F',
    percentBadgeBg: '#B91C2F',
    progressTrackBg: '#F0E6DA',
    rewardsBorder: '#E8C97A',
    rewardsShadow: '#C8960A',
    footerIcon: '#B91C2F',
    walletGradient: ['#8E0E00', '#1F1C18'],
    trophyBg: 'rgba(212, 168, 83, 0.88)',
    actionAccent: '#B91C2F',
  },
  'legacy-platinum': {
    progressGradient: ['#A78BFA', '#7C3AED'],
    tierBadgeBg: '#DDD6FE',
    tierText: '#5B21B6',
    percentBadgeBg: '#6D28D9',
    progressTrackBg: '#EDE9FE',
    rewardsBorder: '#C4B5FD',
    rewardsShadow: '#7C3AED',
    footerIcon: '#6D28D9',
    walletGradient: ['#4C1D95', '#111827'],
    trophyBg: 'rgba(196, 181, 253, 0.9)',
    actionAccent: '#5B21B6',
  },
  'candidate-lover': {
    progressGradient: ['#F87171', '#B91C2F'],
    tierBadgeBg: '#FDE8EC',
    tierText: '#9F1239',
    percentBadgeBg: '#B91C2F',
    progressTrackBg: '#FCE7F3',
    rewardsBorder: '#FDA4AF',
    rewardsShadow: '#E11D48',
    footerIcon: '#B91C2F',
    walletGradient: ['#BE123C', '#4C0519'],
    trophyBg: 'rgba(253, 164, 175, 0.9)',
    actionAccent: '#B91C2F',
  },
  'candidate-master': {
    progressGradient: ['#CBD5E1', '#64748B'],
    tierBadgeBg: '#E2E8F0',
    tierText: '#334155',
    percentBadgeBg: '#475569',
    progressTrackBg: '#F1F5F9',
    rewardsBorder: '#CBD5E1',
    rewardsShadow: '#64748B',
    footerIcon: '#475569',
    walletGradient: ['#64748B', '#1E293B'],
    trophyBg: 'rgba(203, 213, 225, 0.92)',
    actionAccent: '#475569',
  },
  'candidate-ambassador': {
    progressGradient: ['#FDE68A', '#D4A853'],
    tierBadgeBg: '#FEF3C7',
    tierText: '#78350F',
    percentBadgeBg: '#B45309',
    progressTrackBg: '#FFFBEB',
    rewardsBorder: '#FCD34D',
    rewardsShadow: '#D97706',
    footerIcon: '#B45309',
    walletGradient: ['#B45309', '#451A03'],
    trophyBg: 'rgba(253, 230, 138, 0.9)',
    actionAccent: '#B45309',
  },
  'candidate-legend': {
    progressGradient: ['#6B7280', '#111827'],
    tierBadgeBg: '#1F2937',
    tierText: '#FFFFFF',
    percentBadgeBg: '#111827',
    progressTrackBg: '#E5E7EB',
    rewardsBorder: '#374151',
    rewardsShadow: '#111827',
    footerIcon: '#111827',
    walletGradient: ['#27272A', '#09090B'],
    trophyBg: 'rgba(161, 161, 170, 0.9)',
    actionAccent: '#18181B',
  },
};



interface SharedProps {
  model: HomeLoyaltyViewModel | null;
  loading: boolean;
}

interface MembershipProps extends SharedProps {
  onPress: () => void;
}

export function HomeMembershipRegion({
  model,
  loading,
  onPress,
}: MembershipProps) {
  const theme = THEMES[model?.theme ?? 'legacy-silver'];

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      disabled={!model}
      onPress={onPress}
      style={[
        styles.rewardsCard,
        {
          backgroundColor: colors.surface.card,
          borderColor: theme.rewardsBorder,
          shadowColor: theme.rewardsShadow,
        },
      ]}
    >
      <View style={styles.rewardsHeader}>
        <View>
          <Text style={[styles.rewardsLabel, { color: colors.text.secondary }]}>
            MEMBERSHIP STATUS
          </Text>
          {loading || !model ? (
            <SkeletonLoader width={90} height={18} style={{ marginTop: 2 }} />
          ) : (
            <Text style={[styles.rewardsPoints, { color: colors.text.primary }]}>
              {model.progressValueLabel}
            </Text>
          )}
        </View>
        {model ? (
          <View style={styles.badges}>
            <View
              style={[styles.tierBadge, { backgroundColor: theme.tierBadgeBg }]}
            >
              <Text style={[styles.tierText, { color: theme.tierText }]}>
                {model.tierDisplayName} Tier
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.progressContainer}>
        {/* ROW WITH SHORTENED PROGRESS BAR + PERCENTAGE PILL */}
        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressBarBg,
              { backgroundColor: theme.progressTrackBg },
            ]}
          >
            <LinearGradient
              colors={theme.progressGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressBarFill,
                { width: `${model?.progressPercent ?? 0}%` },
              ]}
            />
          </View>
          {model ? (
            <View
              style={[
                styles.percentBadge,
                { backgroundColor: theme.percentBadgeBg },
              ]}
            >
              <Text style={styles.percentText}>
                {Math.round(model.progressPercent)}%
              </Text>
            </View>
          ) : null}
        </View>

        {/* BOTTOM FOOTER */}
        <View style={styles.rewardsFooter}>
          <Gift size={14} color={theme.footerIcon} />
          {loading || !model ? (
            <SkeletonLoader width={140} height={12} />
          ) : (
            <Text
              style={[
                styles.rewardsFooterText,
                { color: colors.text.secondary },
              ]}
            >
              {model.progressMessage}
            </Text>
          )}
        </View>
      </View>

    </TouchableOpacity>
  );
}


interface WalletProps extends SharedProps {
  onAction: () => void;
}

export function HomeWalletRegion({
  model,
  loading,
  onAction,
}: WalletProps) {
  const theme = THEMES[model?.theme ?? 'legacy-silver'];

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={[styles.redPill, { backgroundColor: colors.brand.primary }]} />
        <Text style={[styles.walletTitle, { color: colors.text.primary }]}>
          Gong Cha Wallet
        </Text>
      </View>
      <LinearGradient
        colors={theme.walletGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.walletCard}
      >
        <Image
          source={require('../../../assets/images/liquid.webp')}
          style={styles.walletLiquid}
        />
        <View style={styles.walletTopRow}>
          <View>
            <Text style={styles.walletLabel}>Gong Cha Wallet</Text>
            {loading || !model ? (
              <SkeletonLoader
                width={110}
                height={32}
                style={{
                  marginTop: 2,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
              />
            ) : (
              <>
                <Text style={styles.walletAmount}>{model.walletValueLabel}</Text>
                <Text style={styles.walletSubLabel}>
                  {model.walletValueCaption}
                </Text>
              </>
            )}
          </View>
          <View
            style={[styles.trophyIconBg, { backgroundColor: theme.trophyBg }]}
          >
            <Trophy size={21} color="#2A1F1F" />
          </View>
        </View>
        <View style={styles.walletDivider} />
        <View style={styles.walletBottomRow}>
          <View style={styles.walletCopy}>
            <Text style={styles.walletBenefitTitle}>
              {model?.walletNoticeTitle ?? 'Memuat loyalty'}
            </Text>
            <Text style={styles.walletBenefitDesc}>
              {model?.walletNotice ?? 'Data authoritative sedang dimuat.'}
            </Text>
          </View>
          {model ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.surface.card },
              ]}
              onPress={onAction}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  { color: theme.actionAccent },
                ]}
              >
                {model.walletActionLabel}
              </Text>
              <ChevronRight size={11} color={theme.actionAccent} />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  rewardsCard: {
    borderRadius: 22,
    borderCurve: 'continuous',
    padding: 18,
    marginBottom: 0,
    borderWidth: 1.5,
    elevation: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },


  rewardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rewardsLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  rewardsPoints: { fontSize: 20, fontWeight: 'bold' },
  badges: { alignItems: 'flex-end' },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tierText: { fontSize: 11, fontWeight: 'bold' },
  progressContainer: {
    marginTop: 18,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  percentBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  percentText: { color: '#FFF', fontWeight: 'bold', fontSize: 10 },
  rewardsFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardsFooterText: { fontSize: 11, fontWeight: '500' },


  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  redPill: { width: 4, height: 24, borderRadius: 2, marginRight: 10 },
  walletTitle: { fontSize: 18, fontWeight: 'bold' },
  walletCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 13,
    position: 'relative',
    overflow: 'hidden',
    elevation: 5,
  },
  walletLiquid: {
    position: 'absolute',
    right: -18,
    bottom: -28,
    width: 98,
    height: 146,
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
    fontSize: 11,
    marginBottom: 3,
  },
  walletAmount: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 0.4,
  },
  walletSubLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  trophyIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 10,
  },
  walletBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  walletCopy: { flex: 1, paddingRight: 14 },
  walletBenefitTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  walletBenefitDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    marginTop: 2,
    maxWidth: 170,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 4,
    elevation: 2,
  },
  actionButtonText: { fontWeight: 'bold', fontSize: 10 },
});
