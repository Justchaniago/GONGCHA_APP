import type {
  SessionIdentity,
  SessionPhase,
  SessionRoute,
} from './Session';

export function isEligibleSession(identity: SessionIdentity): boolean {
  const usesPassword = identity.providerIds.includes('password');
  return !usesPassword || identity.emailVerified;
}

export function resolveSessionRoute(phase: SessionPhase): SessionRoute {
  if (
    phase === 'restoring' ||
    phase === 'loading-member' ||
    phase === 'error'
  ) {
    return 'spinner';
  }
  return phase;
}
