import { generateDynamicMemberQrPayload } from './GetDynamicMemberQr.ts';

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
