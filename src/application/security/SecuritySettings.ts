export interface SecuritySettings {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  appLockEnabled: boolean;
  gracePeriodMs: number;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  pinEnabled: false,
  biometricEnabled: false,
  appLockEnabled: true,
  gracePeriodMs: 3 * 60 * 1000,
};
