export interface MemberVoucher {
  id: string;
  code: string;
  title: string;
  rewardId?: string;
  expiresAt?: string;
  expiry?: unknown;
  isUsed?: boolean;
  type?: 'personal' | 'catalog';
  redeemedAt?: string;
  usedAtStore?: string;
}

export interface MemberXpHistoryEntry {
  id: string;
  date?: string;
  createdAt?: unknown;
  amount: number;
  type: 'earn' | 'redeem';
  status?: 'pending' | 'verified' | 'rejected';
  context?: string;
  location?: string;
  transactionId?: string;
}

export interface MemberData {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  points: number;
  pendingPoints: number;
  tierXp: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  photoURL?: string;
  joinDate?: string;
  vouchers?: MemberVoucher[];
  xpHistory?: MemberXpHistoryEntry[];
  profileComplete?: boolean;
  currentPoints: number;
  lifetimePoints: number;
}

export type LegacyMemberDocument = Record<string, unknown>;

export interface PendingMemberSummary {
  loaded: boolean;
  pendingCount: number;
  pendingPoints: number;
}
