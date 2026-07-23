export function isSecurityPinValid(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function didSecurityScopeChange(
  previousScope: string,
  nextScope: string,
): boolean {
  return previousScope !== nextScope;
}

export function isUnlockFresh(
  lastUnlockAt: number,
  now: number,
  gracePeriodMs: number,
): boolean {
  return (
    lastUnlockAt > 0 &&
    now - lastUnlockAt < gracePeriodMs
  );
}

export interface RelockInput {
  pinEnabled: boolean;
  appLockEnabled: boolean;
  backgroundAt: number;
  lastUnlockAt: number;
  now: number;
  gracePeriodMs: number;
}

export function shouldRelock(input: RelockInput): boolean {
  if (!input.pinEnabled || !input.appLockEnabled) {
    return false;
  }
  const elapsed = input.now - input.backgroundAt;
  return (
    elapsed >= input.gracePeriodMs &&
    !isUnlockFresh(input.lastUnlockAt, input.now, input.gracePeriodMs)
  );
}
