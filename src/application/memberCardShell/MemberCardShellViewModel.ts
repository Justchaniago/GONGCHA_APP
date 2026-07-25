export interface CardAnchor {
  x: number;
  y: number;
  size: number;
}

export interface TierTheme {
  gradient: readonly [string, string];
  text: string;
  glow: string;
}

export const CANDIDATE_TIER_THEMES: Record<string, TierTheme> = {
  LOVER: { gradient: ['#FCA5A5', '#EF4444'], text: '#FFFFFF', glow: '#EF4444' },
  MASTER: { gradient: ['#E8E8E8', '#B8B8B8'], text: '#1A1A1A', glow: '#E8E8E8' },
  AMBASSADOR: { gradient: ['#FDE68A', '#F59E0B'], text: '#1A1A1A', glow: '#F59E0B' },
  LEGEND: { gradient: ['#374151', '#111827'], text: '#FFFFFF', glow: '#111827' },
  // Legacy backups
  SILVER: { gradient: ['#E8E8E8', '#B8B8B8'], text: '#1A1A1A', glow: '#E8E8E8' },
  GOLD: { gradient: ['#FFD700', '#FFA500'], text: '#1A1A1A', glow: '#FFD700' },
  PLATINUM: { gradient: ['#E0E7FF', '#C7D2FE'], text: '#312E81', glow: '#C7D2FE' },
};

export interface MemberCardShellViewModel {
  visible: boolean;
  anchor: CardAnchor | null;
  memberName: string;
  joinDateText: string;
  tierName: string;
  theme: TierTheme;
  availableLeavesText: string;
  pendingLeavesText: string;
  pendingExplanationText: string;
  showQrCode: boolean;
  qrValue: string;
  qrPlaceholderText: string;
}

export function buildLegacyMemberCardShellViewModel(
  isCardVisible: boolean,
  anchor: CardAnchor | null,
  member: any
): MemberCardShellViewModel {
  const tierKey = (member?.tier ?? 'Silver').toUpperCase();
  const theme = CANDIDATE_TIER_THEMES[tierKey] ?? CANDIDATE_TIER_THEMES.SILVER;
  const currentPoints = member?.currentPoints ?? member?.points ?? 0;
  const pendingPoints = member?.pendingPoints ?? 0;

  let joinDateText = '';
  if (member?.joinDate) {
    joinDateText = `Joined ${new Date(member.joinDate).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  }

  return {
    visible: isCardVisible,
    anchor: anchor ?? null,
    memberName: member?.fullName ?? 'Guest',
    joinDateText,
    tierName: (member?.tier ?? 'Silver').toUpperCase(),
    theme,
    availableLeavesText: currentPoints.toLocaleString('id-ID'),
    pendingLeavesText: `${pendingPoints.toLocaleString('id-ID')} pending`,
    pendingExplanationText:
      pendingPoints > 0
        ? 'Pending points stay on hold until admin validation is completed.'
        : 'New earn points will appear here while waiting for validation.',
    showQrCode: Boolean(member?.uid),
    qrValue: member?.uid ?? '',
    qrPlaceholderText: 'Loading...',
  };
}

export function buildLocalMemberCardShellViewModel(
  isCardVisible: boolean,
  anchor: CardAnchor | null,
  member: any,
  summary: any
): MemberCardShellViewModel {
  const rawTier = summary?.tier ?? 'LOVER';
  const tierKey = String(rawTier).toUpperCase();
  const theme = CANDIDATE_TIER_THEMES[tierKey] ?? CANDIDATE_TIER_THEMES.LOVER;
  const availableLeaves = summary?.availableLeaves ?? 0;

  let joinDateText = '';
  if (member?.createdAt) {
    joinDateText = `Joined ${new Date(member.createdAt).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
  }

  return {
    visible: isCardVisible,
    anchor: anchor ?? null,
    memberName: member?.displayName ?? 'Local Member',
    joinDateText,
    tierName: tierKey,
    theme,
    availableLeavesText: availableLeaves.toLocaleString('id-ID'),
    pendingLeavesText: '— / Not supported yet',
    pendingExplanationText:
      'Pending Leaves are unsupported locally until an authoritative ESB lifecycle exists.',
    showQrCode: false,
    qrValue: '',
    qrPlaceholderText: 'QR payload gated until security policy approved',
  };
}
