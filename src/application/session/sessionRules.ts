import type {
  SessionIdentity,
  SessionPhase,
  SessionRoute,
} from './Session';

export function isEligibleSession(identity: SessionIdentity): boolean {
  const usesPassword = identity.providerIds.includes('password');
  return !usesPassword || identity.emailVerified;
}

export function isEligibleLocalEmulatorSession(
  identity: SessionIdentity,
): boolean {
  const usesPhoneAlias =
    typeof identity.email === 'string' &&
    /^\d+@gongcha-id\.app$/.test(identity.email);
  return usesPhoneAlias || isEligibleSession(identity);
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
