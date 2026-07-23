export interface AuthProfile {
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

export interface CurrentAuthIdentity {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  providerIds: string[];
}

export const GOOGLE_AUTH_STATUS = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
} as const;
