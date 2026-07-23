import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  deleteField,
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore';

import type { SecurityRepository } from '../../application/ports/security/SecurityRepository';
import {
  DEFAULT_SECURITY_SETTINGS,
  type SecuritySettings,
} from '../../application/security/SecuritySettings';

function scopedKey(scope: string, key: string) {
  return `${key}:${scope}`;
}

export class LegacySecurityRepository implements SecurityRepository {
  constructor(private readonly database: Firestore) {}

  async loadSettings(scope: string): Promise<SecuritySettings> {
    const raw = await AsyncStorage.getItem(
      scopedKey(scope, '@gongcha_security_settings'),
    );
    if (!raw) return DEFAULT_SECURITY_SETTINGS;
    try {
      return { ...DEFAULT_SECURITY_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SECURITY_SETTINGS;
    }
  }

  saveSettings(scope: string, settings: SecuritySettings) {
    return AsyncStorage.setItem(
      scopedKey(scope, '@gongcha_security_settings'),
      JSON.stringify(settings),
    );
  }

  async hasPin(scope: string) {
    if (!this.validScope(scope)) return false;
    const data = await this.readMember(scope);
    return Boolean(data?.securityPinHash && data?.securityPinSalt);
  }

  async setPin(scope: string, pin: string) {
    this.requireScope(scope);
    const salt =
      typeof Crypto.randomUUID === 'function'
        ? Crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    const hash = await this.hashPin(pin, salt);
    await setDoc(
      this.memberRef(scope),
      {
        securityPinHash: hash,
        securityPinSalt: salt,
        securityPinUpdatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  async verifyPin(scope: string, pin: string) {
    if (!this.validScope(scope)) return false;
    const data = await this.readMember(scope);
    const hash = data?.securityPinHash;
    const salt = data?.securityPinSalt;
    if (!hash || !salt) return false;
    return (await this.hashPin(pin, salt)) === hash;
  }

  async clearPin(scope: string) {
    if (!this.validScope(scope)) return;
    await Promise.all([
      setDoc(
        this.memberRef(scope),
        {
          securityPinHash: deleteField(),
          securityPinSalt: deleteField(),
          securityPinUpdatedAt: deleteField(),
        },
        { merge: true },
      ),
      AsyncStorage.removeItem(
        scopedKey(scope, '@gongcha_security_last_unlock'),
      ),
    ]);
  }

  async getLastUnlockAt(scope: string) {
    const raw = await AsyncStorage.getItem(
      scopedKey(scope, '@gongcha_security_last_unlock'),
    );
    return raw ? Number(raw) || 0 : 0;
  }

  setLastUnlockAt(scope: string, timestamp: number) {
    return AsyncStorage.setItem(
      scopedKey(scope, '@gongcha_security_last_unlock'),
      String(timestamp),
    );
  }

  clearLastUnlockAt(scope: string) {
    return AsyncStorage.removeItem(
      scopedKey(scope, '@gongcha_security_last_unlock'),
    );
  }

  private validScope(scope: string) {
    return Boolean(scope && scope !== 'guest');
  }

  private requireScope(scope: string) {
    if (!this.validScope(scope)) {
      throw new Error('Member profile is not ready yet.');
    }
  }

  private memberRef(scope: string) {
    return doc(this.database, 'users', scope);
  }

  private async readMember(scope: string) {
    return (await getDoc(this.memberRef(scope))).data();
  }

  private hashPin(pin: string, salt: string) {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${salt}:${pin}`,
    );
  }
}
