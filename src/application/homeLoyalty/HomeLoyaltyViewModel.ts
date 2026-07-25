import type { LoyaltySummary } from '../loyaltySummary/LoyaltySummary';
import type { MemberData } from '../member/MemberData';

export type HomeLoyaltyThemeKey =
  | 'legacy-silver'
  | 'legacy-gold'
  | 'legacy-platinum'
  | 'candidate-lover'
  | 'candidate-master'
  | 'candidate-ambassador'
  | 'candidate-legend';

export interface HomeLoyaltyViewModel {
  theme: HomeLoyaltyThemeKey;
  tierDisplayName: string;
  progressValueLabel: string;
  progressPercent: number;
  progressMessage: string;
  walletValueLabel: string;
  walletValueCaption: string;
  walletNoticeTitle: string;
  walletNotice: string;
  walletActionLabel: string;
}

const LEGACY_POLICY = {
  Silver: {
    theme: 'legacy-silver',
    target: 5000,
    next: 'Gold',
  },
  Gold: {
    theme: 'legacy-gold',
    target: 15000,
    next: 'Platinum',
  },
  Platinum: {
    theme: 'legacy-platinum',
    target: 15000,
    next: null,
  },
} as const;

export function buildLegacyHomeLoyaltyViewModel(
  member: MemberData | null,
): HomeLoyaltyViewModel {
  const tier = member?.tier ?? 'Silver';
  const policy = LEGACY_POLICY[tier];
  const tierXp = member?.tierXp ?? 0;
  const currentPoints = member?.currentPoints ?? member?.points ?? 0;
  const pendingPoints = member?.pendingPoints ?? 0;
  const terminal = tier === 'Platinum';
  const progressPercent = terminal
    ? 100
    : Math.max(0, Math.min((tierXp / policy.target) * 100, 100));
  const remaining = terminal ? 0 : Math.max(0, policy.target - tierXp);

  return {
    theme: policy.theme,
    tierDisplayName: tier,
    progressValueLabel: `${tierXp} / ${policy.target} XP`,
    progressPercent,
    progressMessage: terminal
      ? 'You are Top Tier!'
      : `${remaining} XP to reach next Tier!`,
    walletValueLabel: currentPoints.toLocaleString('id-ID'),
    walletValueCaption: 'Available points',
    walletNoticeTitle: 'Tier Benefits',
    walletNotice:
      pendingPoints > 0
        ? `${pendingPoints.toLocaleString(
            'id-ID',
          )} pts pending validation. Only available points can be redeemed.`
        : 'Only available points can be redeemed. Pending points will appear here while waiting for validation.',
    walletActionLabel: 'Redeem Catalog',
  };
}

const CANDIDATE_THEME = {
  LOVER: 'candidate-lover',
  MASTER: 'candidate-master',
  AMBASSADOR: 'candidate-ambassador',
  LEGEND: 'candidate-legend',
} as const;

function leavesLabel(value: number): string {
  return value === 1 ? 'Leaf' : 'Leaves';
}

export function buildLocalHomeLoyaltyViewModel(
  summary: LoyaltySummary,
): HomeLoyaltyViewModel {
  const target =
    summary.tier.nextThreshold ?? summary.tier.currentThreshold;
  const terminal = summary.tier.nextCode === null;

  return {
    theme: CANDIDATE_THEME[summary.tier.code],
    tierDisplayName: summary.tier.displayName,
    progressValueLabel: `${summary.qualifyingLeaves.toLocaleString(
      'id-ID',
    )} / ${target.toLocaleString('id-ID')} ${leavesLabel(target)}`,
    progressPercent: summary.tier.progressPercent,
    progressMessage: terminal
      ? 'Tier kandidat tertinggi tercapai'
      : `${summary.tier.remaining.toLocaleString('id-ID')} ${leavesLabel(
          summary.tier.remaining,
        )} menuju ${summary.tier.nextDisplayName}`,
    walletValueLabel: summary.availableLeaves.toLocaleString('id-ID'),
    walletValueCaption: `Available ${leavesLabel(summary.availableLeaves)}`,
    walletNoticeTitle: 'Candidate Policy',
    walletNotice: `Pending belum didukung dan benefit belum menjadi entitlement (${summary.policyVersion}).`,
    walletActionLabel: 'Lihat Activity',
  };
}
