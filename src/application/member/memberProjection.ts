import type { SessionIdentity } from '../session/Session';
import type {
  LegacyMemberDocument,
  MemberData,
  MemberVoucher,
  MemberXpHistoryEntry,
  PendingMemberSummary,
} from './MemberData';

export const EMPTY_PENDING_SUMMARY: PendingMemberSummary = {
  loaded: false,
  pendingCount: 0,
  pendingPoints: 0,
};

export function reconcilePendingPoints(
  pendingPoints: number,
  summary: PendingMemberSummary,
): number {
  if (!summary.loaded) {
    return pendingPoints;
  }
  if (summary.pendingCount === 0) {
    return 0;
  }
  return Math.max(
    0,
    Math.min(pendingPoints, summary.pendingPoints || pendingPoints),
  );
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function buildMemberData(
  identity: SessionIdentity,
  data: LegacyMemberDocument | null,
  pendingSummary: PendingMemberSummary,
): MemberData {
  if (!data) {
    return {
      uid: identity.uid,
      fullName: identity.displayName ?? 'Member',
      email: identity.email ?? '',
      phoneNumber: identity.phoneNumber ?? '',
      points: 0,
      pendingPoints: 0,
      tierXp: 0,
      tier: 'Silver',
      photoURL: identity.photoURL ?? '',
      joinDate: '',
      vouchers: [],
      xpHistory: [],
      profileComplete: false,
      currentPoints: 0,
      lifetimePoints: 0,
    };
  }

  const currentPoints = asNumber(data.currentPoints, asNumber(data.points));
  const rawPendingPoints = asNumber(data.pendingPoints);

  const tierXp = asNumber(
    data.tierXp,
    asNumber(data.lifetimePoints, asNumber(data.xp)),
  );
  const lifetimePoints = asNumber(
    data.lifetimePoints,
    asNumber(data.tierXp, asNumber(data.xp)),
  );
  const tier =
    data.tier === 'Gold' || data.tier === 'Platinum'
      ? data.tier
      : 'Silver';

  return {
    uid: identity.uid,
    fullName: asString(data.fullName, asString(data.name, 'Member')),
    email: asString(data.email, identity.email ?? ''),
    phoneNumber: asString(data.phoneNumber, asString(data.phone)),
    points: currentPoints,
    pendingPoints: reconcilePendingPoints(rawPendingPoints, pendingSummary),
    tierXp,
    tier,
    photoURL: asString(data.photoURL),
    joinDate: asString(data.joinDate, asString(data.joinedDate)),
    vouchers: (data.vouchers ??
      data.activeVouchers ??
      []) as MemberVoucher[],
    xpHistory: (data.xpHistory ?? []) as MemberXpHistoryEntry[],
    profileComplete:
      typeof data.profileComplete === 'boolean' ? data.profileComplete : false,
    currentPoints,
    lifetimePoints,
  };
}

export function applyPendingSummary(
  member: MemberData,
  summary: PendingMemberSummary,
): MemberData {
  const pendingPoints = reconcilePendingPoints(member.pendingPoints, summary);
  return pendingPoints === member.pendingPoints
    ? member
    : { ...member, pendingPoints };
}
