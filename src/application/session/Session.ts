export type SessionPhase =
  | 'restoring'
  | 'anonymous'
  | 'loading-member'
  | 'needs-profile'
  | 'ready'
  | 'error';

export interface SessionIdentity {
  uid: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerIds: string[];
}

export type SessionRoute =
  | 'spinner'
  | 'anonymous'
  | 'needs-profile'
  | 'ready';
