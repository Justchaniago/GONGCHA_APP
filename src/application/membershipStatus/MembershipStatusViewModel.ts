import type { LoyaltySummary } from '../loyaltySummary/LoyaltySummary';
import type { LoyaltyActivityItem } from '../loyaltyActivity/LoyaltyActivity';
import type {
  MemberData,
  MemberXpHistoryEntry,
} from '../member/MemberData';

export type MembershipThemeKey =
  | 'legacy-silver'
  | 'legacy-gold'
  | 'legacy-platinum'
  | 'candidate-lover'
  | 'candidate-master'
  | 'candidate-ambassador'
  | 'candidate-legend'
  | 'candidate-family';

export type MembershipBenefitIcon = 'zap' | 'gift' | 'star';

export interface MembershipBenefitViewModel {
  icon: MembershipBenefitIcon;
  label: string;
}

export interface MembershipActivityViewModel {
  id: string;
  status: 'redeem' | 'verified' | 'rejected' | 'pending';
  context: string;
  location: string | null;
  amountLabel: string;
  dateLabel: string;
}

export interface MembershipStatViewModel {
  label: string;
  valueLabel: string;
  tone: 'default' | 'pending';
}

export interface MembershipStatusViewModel {
  theme: MembershipThemeKey;
  tierDisplayName: string;
  totalLabel: string;
  totalValueLabel: string;
  progressPercent: number;
  progressCurrentLabel: string;
  progressTargetLabel: string;
  progressMessage: {
    emphasis: string;
    suffix: string;
    terminal: boolean;
  };
  stats: [
    MembershipStatViewModel,
    MembershipStatViewModel,
    MembershipStatViewModel,
  ];
  benefitsTitle: string;
  multiplierLabel: string | null;
  benefits: MembershipBenefitViewModel[];
  benefitsNotice: string | null;
  nextTierHint: string | null;
  activity:
    | {
        kind: 'items';
        title: string;
        emptyMessage: string;
        items: MembershipActivityViewModel[];
      }
    | {
        kind: 'link';
        title: string;
        message: string;
        actionLabel: string;
      };
}

const LEGACY_TIER_POLICY = {
  Silver: {
    theme: 'legacy-silver',
    next: 'Gold',
    target: 5000,
    multiplier: '1×',
    benefits: [
      { icon: 'zap', label: '1× poin per pembelian' },
      { icon: 'gift', label: 'Akses katalog reward' },
      { icon: 'star', label: 'Tukar voucher eksklusif' },
    ],
  },
  Gold: {
    theme: 'legacy-gold',
    next: 'Platinum',
    target: 15000,
    multiplier: '1.25×',
    benefits: [
      { icon: 'zap', label: '1.25× poin per pembelian' },
      { icon: 'gift', label: 'Voucher ulang tahun eksklusif' },
      { icon: 'star', label: 'Early access menu baru' },
    ],
  },
  Platinum: {
    theme: 'legacy-platinum',
    next: null,
    target: 15000,
    multiplier: '1.5×',
    benefits: [
      { icon: 'zap', label: '1.5× poin per pembelian' },
      { icon: 'gift', label: 'Reward eksklusif Platinum' },
      { icon: 'star', label: 'Priority customer support' },
    ],
  },
} as const;

function toMs(entry: MemberXpHistoryEntry): number {
  const raw = entry.createdAt ?? entry.date;
  if (!raw) return 0;
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'toDate' in raw &&
    typeof raw.toDate === 'function'
  ) {
    return raw.toDate().getTime();
  }
  return new Date(raw as string | number | Date).getTime();
}

function formatEntryDate(
  entry: MemberXpHistoryEntry,
  nowMs: number,
): string {
  const ms = toMs(entry);
  if (!ms) return '';
  const diff = (nowMs - ms) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}h lalu`;
  return new Date(ms).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

function mapLegacyActivity(
  history: MemberXpHistoryEntry[] | undefined,
  nowMs: number,
): MembershipActivityViewModel[] {
  return [...(history ?? [])]
    .sort((left, right) => toMs(right) - toMs(left))
    .slice(0, 30)
    .map((entry) => ({
      id: entry.id,
      status:
        entry.type === 'redeem'
          ? 'redeem'
          : entry.status === 'verified' || entry.status === 'rejected'
            ? entry.status
            : 'pending',
      context:
        entry.context ??
        entry.location ??
        (entry.type === 'redeem' ? 'Tukar poin' : 'Transaksi'),
      location:
        entry.location && entry.context ? entry.location : null,
      amountLabel: `${entry.type === 'redeem' ? '−' : '+'}${Math.abs(
        entry.amount,
      ).toLocaleString('id-ID')} XP`,
      dateLabel: formatEntryDate(entry, nowMs),
    }));
}

export function buildLegacyMembershipStatusViewModel(
  member: MemberData | null,
  nowMs = Date.now(),
): MembershipStatusViewModel {
  const tier = member?.tier ?? 'Silver';
  const policy = LEGACY_TIER_POLICY[tier];
  const tierXp = member?.tierXp ?? 0;
  const terminal = tier === 'Platinum';
  const progressPercent = terminal
    ? 100
    : Math.max(0, Math.min((tierXp / policy.target) * 100, 100));
  const remaining = terminal ? 0 : Math.max(0, policy.target - tierXp);

  return {
    theme: policy.theme,
    tierDisplayName: tier,
    totalLabel: 'Total XP',
    totalValueLabel: tierXp.toLocaleString('id-ID'),
    progressPercent,
    progressCurrentLabel: `${tierXp.toLocaleString('id-ID')} XP`,
    progressTargetLabel: `${policy.target.toLocaleString('id-ID')} XP`,
    progressMessage: terminal
      ? {
          emphasis: 'Tier tertinggi',
          suffix: ' — Selamat!',
          terminal: true,
        }
      : {
          emphasis: `${remaining.toLocaleString('id-ID')} XP`,
          suffix: ` lagi untuk mencapai ${policy.next}`,
          terminal: false,
        },
    stats: [
      {
        valueLabel: (member?.currentPoints ?? member?.points ?? 0).toLocaleString(
          'id-ID',
        ),
        label: 'Poin Tersedia',
        tone: 'default',
      },
      {
        valueLabel: (member?.pendingPoints ?? 0).toLocaleString('id-ID'),
        label: 'Poin Pending',
        tone: (member?.pendingPoints ?? 0) > 0 ? 'pending' : 'default',
      },
      {
        valueLabel: (member?.lifetimePoints ?? 0).toLocaleString('id-ID'),
        label: 'Lifetime',
        tone: 'default',
      },
    ],
    benefitsTitle: `Benefit ${tier}`,
    multiplierLabel: `${policy.multiplier} earn`,
    benefits: policy.benefits.map((benefit) => ({ ...benefit })),
    benefitsNotice: null,
    nextTierHint: terminal
      ? null
      : `Naik ke ${policy.next} untuk unlock multiplier lebih tinggi & reward eksklusif.`,
    activity: {
      kind: 'items',
      title: 'Riwayat XP',
      emptyMessage:
        'Belum ada riwayat. Mulai bertransaksi untuk mengumpulkan XP.',
      items: mapLegacyActivity(member?.xpHistory, nowMs),
    },
  };
}

const CANDIDATE_THEME = {
  LOVER: 'candidate-lover',
  MASTER: 'candidate-master',
  AMBASSADOR: 'candidate-ambassador',
  LEGEND: 'candidate-legend',
  FAMILY: 'candidate-family',
} as const;

const CANDIDATE_TIER_POLICY = {
  LOVER: {
    multiplier: '1×',
    benefits: [
      { icon: 'zap' as const, label: 'Earn 1 Leaf per Rp 10.000 spent' },
      { icon: 'gift' as const, label: 'Free birthday treat, rewards (extra topping, promo)' },
      { icon: 'star' as const, label: 'Access to streaks, challenges & App-only offers' },
    ],
  },
  MASTER: {
    multiplier: '1.2×',
    benefits: [
      { icon: 'zap' as const, label: 'Early access to new drinks' },
      { icon: 'gift' as const, label: 'Surprise & Delight moments' },
      { icon: 'star' as const, label: 'App-only offers & Member-only bundles' },
    ],
  },
  AMBASSADOR: {
    multiplier: '1.5×',
    benefits: [
      { icon: 'zap' as const, label: 'Free topping each month' },
      { icon: 'gift' as const, label: 'Unlock Partner perks (delivery discounts)' },
      { icon: 'star' as const, label: 'Surprise & Delight moments' },
    ],
  },
  LEGEND: {
    multiplier: '2×',
    benefits: [
      { icon: 'zap' as const, label: 'Priority queue during peak hours' },
      { icon: 'gift' as const, label: 'Fan events & Limited merch offers' },
      { icon: 'star' as const, label: 'Exclusive VIP pass & Access' },
    ],
  },
  FAMILY: {
    multiplier: '3×',
    benefits: [
      { icon: 'zap' as const, label: '3x earn rate on hero SKUs & Free upsizes anytime' },
      { icon: 'gift' as const, label: 'Skip-the-queue access & Masterclass invites' },
      { icon: 'star' as const, label: 'Prestige value & Access only invites' },
    ],
  },
} as const;

function leavesLabel(value: number): string {
  return value === 1 ? 'Leaf' : 'Leaves';
}

export function buildLocalMembershipStatusViewModel(
  summary: LoyaltySummary,
  items: LoyaltyActivityItem[] = [],
): MembershipStatusViewModel {
  const terminal = summary.tier.nextCode === null;
  const policy = CANDIDATE_TIER_POLICY[summary.tier.code] || CANDIDATE_TIER_POLICY.LOVER;

  const activityItems: MembershipActivityViewModel[] = items.slice(0, 15).map((entry) => {
    const isRedeem = entry.eventType === 'redemption';
    return {
      id: entry.activityId,
      status: isRedeem ? 'redeem' : 'verified',
      context: isRedeem ? 'Penukaran Rewards' : 'Transaksi Gong Cha',
      location: entry.externalOrderReference ? `Order: ${entry.externalOrderReference}` : null,
      amountLabel: `${isRedeem ? '−' : '+'}${Math.abs(entry.pointsDelta)} Leaves`,
      dateLabel: new Date(entry.activityAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };
  });

  return {
    theme: CANDIDATE_THEME[summary.tier.code],
    tierDisplayName: summary.tier.displayName,
    totalLabel: 'Qualifying Leaves',
    totalValueLabel: summary.qualifyingLeaves.toLocaleString('id-ID'),
    progressPercent: summary.tier.progressPercent,
    progressCurrentLabel: `${summary.qualifyingLeaves.toLocaleString(
      'id-ID',
    )} ${leavesLabel(summary.qualifyingLeaves)}`,
    progressTargetLabel:
      summary.tier.nextThreshold === null
        ? `${summary.tier.currentThreshold.toLocaleString('id-ID')} ${leavesLabel(
            summary.tier.currentThreshold,
          )}`
        : `${summary.tier.nextThreshold.toLocaleString('id-ID')} ${leavesLabel(
            summary.tier.nextThreshold,
          )}`,
    progressMessage: terminal
      ? {
          emphasis: 'Tier kandidat tertinggi',
          suffix: ' — Selamat!',
          terminal: true,
        }
      : {
          emphasis: `${summary.tier.remaining.toLocaleString(
            'id-ID',
          )} ${leavesLabel(summary.tier.remaining)}`,
          suffix: ` lagi untuk mencapai ${summary.tier.nextDisplayName}`,
          terminal: false,
        },
    stats: [
      {
        valueLabel: summary.availableLeaves.toLocaleString('id-ID'),
        label: 'Leaves Tersedia',
        tone: 'default',
      },
      {
        valueLabel: summary.qualifyingLeaves.toLocaleString('id-ID'),
        label: 'Leaves Kualifikasi',
        tone: 'default',
      },
      {
        valueLabel: '0',
        label: 'Leaves Pending',
        tone: 'default',
      },
    ],
    benefitsTitle: `Benefit ${summary.tier.displayName}`,
    multiplierLabel: `${policy.multiplier} earn`,
    benefits: policy.benefits.map((benefit) => ({ ...benefit })),
    benefitsNotice: null,
    nextTierHint: terminal
      ? null
      : `Naik ke ${summary.tier.nextDisplayName} untuk unlock multiplier lebih tinggi & reward eksklusif.`,
    activity: {
      kind: 'items',
      title: 'Riwayat Leaves',
      emptyMessage: 'Belum ada riwayat Leaves. Mulai bertransaksi untuk mengumpulkan Leaves.',
      items: activityItems,
    },
  };
}
