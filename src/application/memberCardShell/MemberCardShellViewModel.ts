import { generateDynamicMemberQrPayload } from './GetDynamicMemberQr';

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
  LOVER: { gradient: ['#C8102E', '#9A0D24'], text: '#FAF8F5', glow: '#C8102E' },
  MASTER: { gradient: ['#4A4A4A', '#2D2D2D'], text: '#FAF8F5', glow: '#4A4A4A' },
  AMBASSADOR: { gradient: ['#D4AF37', '#B8860B'], text: '#FAF8F5', glow: '#D4AF37' },
  LEGEND: { gradient: ['#1D1D1F', '#000000'], text: '#FAF8F5', glow: '#1D1D1F' },
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

export function buildLocalMemberCardShellViewModel(
  isCardVisible: boolean,
  anchor: CardAnchor | null,
  member: any,
  summary: any,
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

  const uid = member?.uid || summary?.memberUid || member?.id;
  const showQrCode = Boolean(uid);
  const qrValue = uid ? generateDynamicMemberQrPayload(uid).qrPayload : '';

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
    showQrCode,
    qrValue,
    qrPlaceholderText: 'Loading...',
  };
}
