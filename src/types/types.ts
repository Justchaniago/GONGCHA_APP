export type MemberTier = 'Silver' | 'Gold' | 'Platinum';

export interface UserProfile {
  id: string;
  name: string;
  phoneNumber: string;
  currentPoints: number;
  lifetimePoints: number;
  tier: MemberTier;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  pointsEarned: number;
}
