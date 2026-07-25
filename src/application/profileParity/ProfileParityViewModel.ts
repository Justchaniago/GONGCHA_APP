import type {
  LoyaltyActivityItem,
} from '../loyaltyActivity/LoyaltyActivity';
import type { LoyaltySummary } from '../loyaltySummary/LoyaltySummary';
import type { MemberData } from '../member/MemberData';

export interface ProfileStatViewModel {
  label: string;
  valueLabel: string;
  hint: string;
  tone: 'default' | 'pending';
}

export interface ProfileHistoryItemViewModel {
  id: string;
  direction: 'up' | 'down';
  title: string;
  pointsLabel: string;
  pointsTone: 'positive' | 'negative' | 'pending' | 'rejected';
  dayLabel: string;
  timeLabel: string;
  transactionAmountLabel: string | null;
  storeLabel: string | null;
  referenceLabel: string | null;
  statusLabel: 'Pending validation' | 'Rejected' | null;
}

export interface ProfileParityViewModel {
  identity: {
    fullName: string;
    phoneNumber: string;
    photoUrl: string | undefined;
    badgeLabel: string | null;
  };
  stats: [ProfileStatViewModel, ProfileStatViewModel];
  history: {
    title: string;
    emptyMessage: string;
    footerMessage: string;
    items: ProfileHistoryItemViewModel[];
    hasMore: boolean;
  };
}

export interface LegacyProfileHistoryInput {
  id: string;
  createdAtIso: string;
  status: 'pending' | 'verified' | 'rejected';
  type: 'earn' | 'redeem';
  pointsAmount: number;
  title: string;
  storeLabel: string;
  referenceLabel: string;
  isPending: boolean;
  totalAmount?: number;
  voucherTitle?: string;
}

function sameDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatDay(value: string, nowMs: number): string {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date(nowMs);
  const yesterday = new Date(nowMs);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(value: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dayKey(value: string): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function buildLegacyProfileParityViewModel(
  member: MemberData | null,
  history: LegacyProfileHistoryInput[],
  visibleDayCount: number,
  nowMs = Date.now(),
): ProfileParityViewModel {
  const groups = new Map<number, LegacyProfileHistoryInput[]>();
  history.forEach((item) => {
    const key = dayKey(item.createdAtIso);
    const values = groups.get(key) ?? [];
    values.push(item);
    groups.set(key, values);
  });
  const orderedGroups = Array.from(groups.entries()).sort(
    (left, right) => right[0] - left[0],
  );
  const visibleItems = orderedGroups
    .slice(0, visibleDayCount)
    .flatMap(([, items]) => items);

  return {
    identity: {
      fullName: member?.fullName || 'Guest',
      phoneNumber: member?.phoneNumber || '-',
      photoUrl: member?.photoURL,
      badgeLabel: member?.tier === 'Platinum' ? 'PLATINUM MEMBER' : null,
    },
    stats: [
      {
        label: 'Available Points',
        valueLabel: (
          member?.currentPoints ??
          member?.points ??
          0
        ).toLocaleString('id-ID'),
        hint: 'Ready to redeem',
        tone: 'default',
      },
      {
        label: 'Pending Points',
        valueLabel: (member?.pendingPoints ?? 0).toLocaleString('id-ID'),
        hint: 'Awaiting validation',
        tone: 'pending',
      },
    ],
    history: {
      title: 'Transaction History',
      emptyMessage: 'No transaction history yet.',
      footerMessage: 'Scroll up to reveal earlier dates',
      items: visibleItems.map((item) => {
        const redeem = item.type === 'redeem';
        return {
          id: item.id,
          direction: redeem ? 'down' : 'up',
          title:
            redeem && item.voucherTitle ? item.voucherTitle : item.title,
          pointsLabel: `${item.pointsAmount > 0 ? '+' : ''}${
            item.pointsAmount
          } pts`,
          pointsTone: redeem
            ? 'negative'
            : item.isPending
              ? 'pending'
              : item.status === 'rejected'
                ? 'rejected'
                : 'positive',
          dayLabel: formatDay(item.createdAtIso, nowMs),
          timeLabel: formatTime(item.createdAtIso),
          transactionAmountLabel:
            !redeem && item.totalAmount != null
              ? `Rp ${item.totalAmount.toLocaleString('id-ID')}`
              : null,
          storeLabel: item.storeLabel || null,
          referenceLabel:
            !redeem && item.referenceLabel
              ? `Ref ${item.referenceLabel}`
              : null,
          statusLabel: item.isPending
            ? 'Pending validation'
            : item.status === 'rejected'
              ? 'Rejected'
              : null,
        };
      }),
      hasMore: orderedGroups.length > visibleDayCount,
    },
  };
}

const LOCAL_EVENT_TITLE = {
  earn: 'Points earned',
  refund_reversal: 'Points reversed',
  redemption: 'Reward redemption',
} as const;

export function buildLocalProfileParityViewModel(
  member: MemberData | null,
  summary: LoyaltySummary | null,
  activities: LoyaltyActivityItem[],
  hasMore: boolean,
  nowMs = Date.now(),
): ProfileParityViewModel {
  return {
    identity: {
      fullName: member?.fullName || 'Member',
      phoneNumber: member?.phoneNumber || '-',
      photoUrl: member?.photoURL,
      badgeLabel: summary ? summary.tier.displayName.toUpperCase() : null,
    },
    stats: [
      {
        label: 'Available Leaves',
        valueLabel: summary
          ? summary.availableLeaves.toLocaleString('id-ID')
          : '—',
        hint: summary ? 'Authoritative balance' : 'Unavailable',
        tone: 'default',
      },
      {
        label: 'Pending Leaves',
        valueLabel: '—',
        hint: 'Not supported yet',
        tone: 'pending',
      },
    ],
    history: {
      title: 'Loyalty Activity',
      emptyMessage: 'No loyalty activity yet.',
      footerMessage: 'Scroll up to reveal earlier activity',
      items: activities.map((item) => ({
        id: item.activityId,
        direction: item.pointsDelta > 0 ? 'up' : 'down',
        title: LOCAL_EVENT_TITLE[item.eventType],
        pointsLabel: `${item.pointsDelta > 0 ? '+' : ''}${
          item.pointsDelta
        } Leaves`,
        pointsTone: item.pointsDelta > 0 ? 'positive' : 'negative',
        dayLabel: formatDay(item.activityAt, nowMs),
        timeLabel: formatTime(item.activityAt),
        transactionAmountLabel: null,
        storeLabel: null,
        referenceLabel: item.externalOrderReference
          ? `Ref ${item.externalOrderReference}`
          : null,
        statusLabel: null,
      })),
      hasMore,
    },
  };
}
