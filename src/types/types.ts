export type MemberTier = 'Silver' | 'Gold' | 'Platinum';

export interface XpRecord {
  id: string;
  date: string;
  amount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  phoneNumber: string;
  currentPoints: number;
  tierXp: number;
  xpHistory: XpRecord[];
  tier: MemberTier;
  joinedDate: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  pointsEarned: number;
  items: string[];
}
