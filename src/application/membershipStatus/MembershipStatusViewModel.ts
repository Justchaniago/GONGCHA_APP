import type { LoyaltySummary } from '../loyaltySummary/LoyaltySummary';
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
  | 'candidate-legend';

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
} as const;

function leavesLabel(value: number): string {
  return value === 1 ? 'Leaf' : 'Leaves';
}

export function buildLocalMembershipStatusViewModel(
  summary: LoyaltySummary,
): MembershipStatusViewModel {
  const terminal = summary.tier.nextCode === null;
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
        valueLabel: '—',
        label: 'Pending Belum Didukung',
        tone: 'pending',
      },
    ],
    benefitsTitle: `Benefit ${summary.tier.displayName}`,
    multiplierLabel: null,
    benefits: [],
    benefitsNotice: `Benefit belum dikonfigurasi untuk policy ${summary.policyVersion} dan belum menjadi entitlement.`,
    nextTierHint: null,
    activity: {
      kind: 'link',
      title: 'Riwayat Leaves',
      message:
        'Riwayat authoritative tersedia di Loyalty Activity dari FastAPI.',
      actionLabel: 'Lihat Loyalty Activity',
    },
  };
}
