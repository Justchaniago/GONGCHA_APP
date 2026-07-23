import type { SecuritySettings } from '../../security/SecuritySettings';

export interface SecurityRepository {
  loadSettings(scope: string): Promise<SecuritySettings>;
  saveSettings(scope: string, settings: SecuritySettings): Promise<void>;
  hasPin(scope: string): Promise<boolean>;
  setPin(scope: string, pin: string): Promise<void>;
  verifyPin(scope: string, pin: string): Promise<boolean>;
  clearPin(scope: string): Promise<void>;
  getLastUnlockAt(scope: string): Promise<number>;
  setLastUnlockAt(scope: string, timestamp: number): Promise<void>;
  clearLastUnlockAt(scope: string): Promise<void>;
}
