export interface ProfileData {
  uid: string;
  name: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  photoURL?: string;
  points?: number;
  currentPoints?: number;
  pendingPoints?: number;
  lifetimePoints?: number;
  tierXp?: number;
  xp?: number;
  tier: string;
  joinedDate?: string;
  xpHistory?: unknown[];
  vouchers?: unknown[];
  activeVouchers?: unknown[];
  role?: string;
  profileComplete?: boolean;
  emailVerified?: boolean;
}

export type ProfileUpdates = Partial<ProfileData>;

export type PickProfileImageResult =
  | { kind: 'permission-denied' }
  | { kind: 'cancelled' }
  | { kind: 'selected'; dataUri: string };
