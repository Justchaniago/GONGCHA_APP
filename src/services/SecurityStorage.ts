import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { deleteField, doc, getDoc, setDoc } from 'firebase/firestore';

import { firestoreDb } from '../config/firebase';

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

function getSalt() {
  if (typeof Crypto.randomUUID === 'function') {
    return Crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

function getScopedAsyncKey(scope: string, key: string) {
  return `${key}:${scope}`;
}

function getUserSecurityRef(scope: string) {
  return doc(firestoreDb, 'users', scope);
}

export const SecurityStorage = {
  async loadSettings(scope: string): Promise<SecuritySettings> {
    const raw = await AsyncStorage.getItem(getScopedAsyncKey(scope, '@gongcha_security_settings'));
    if (!raw) {
      return DEFAULT_SECURITY_SETTINGS;
    }

    try {
      return {
        ...DEFAULT_SECURITY_SETTINGS,
        ...JSON.parse(raw),
      };
    } catch {
      return DEFAULT_SECURITY_SETTINGS;
    }
  },

  async saveSettings(scope: string, settings: SecuritySettings) {
    await AsyncStorage.setItem(getScopedAsyncKey(scope, '@gongcha_security_settings'), JSON.stringify(settings));
  },

  async hasPin(scope: string) {
    if (!scope || scope === 'guest') {
      return false;
    }

    const snapshot = await getDoc(getUserSecurityRef(scope));
    const data = snapshot.data();
    return Boolean(data?.securityPinHash && data?.securityPinSalt);
  },

  async setPin(scope: string, pin: string) {
    if (!scope || scope === 'guest') {
      throw new Error('Member profile is not ready yet.');
    }

    const salt = getSalt();
    const hash = await hashPin(pin, salt);

    await setDoc(
      getUserSecurityRef(scope),
      {
        securityPinHash: hash,
        securityPinSalt: salt,
        securityPinUpdatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  },

  async verifyPin(scope: string, pin: string) {
    if (!scope || scope === 'guest') {
      return false;
    }

    const snapshot = await getDoc(getUserSecurityRef(scope));
    const data = snapshot.data();
    const hash = data?.securityPinHash;
    const salt = data?.securityPinSalt;

    if (!hash || !salt) {
      return false;
    }

    const candidateHash = await hashPin(pin, salt);
    return candidateHash === hash;
  },

  async clearPin(scope: string) {
    if (!scope || scope === 'guest') {
      return;
    }

    await Promise.all([
      setDoc(
        getUserSecurityRef(scope),
        {
          securityPinHash: deleteField(),
          securityPinSalt: deleteField(),
          securityPinUpdatedAt: deleteField(),
        },
        { merge: true },
      ),
      AsyncStorage.removeItem(getScopedAsyncKey(scope, '@gongcha_security_last_unlock')),
    ]);
  },

  async getLastUnlockAt(scope: string) {
    const raw = await AsyncStorage.getItem(getScopedAsyncKey(scope, '@gongcha_security_last_unlock'));
    return raw ? Number(raw) || 0 : 0;
  },

  async setLastUnlockAt(scope: string, timestamp: number) {
    await AsyncStorage.setItem(getScopedAsyncKey(scope, '@gongcha_security_last_unlock'), String(timestamp));
  },

  async clearLastUnlockAt(scope: string) {
    await AsyncStorage.removeItem(getScopedAsyncKey(scope, '@gongcha_security_last_unlock'));
  },
};
