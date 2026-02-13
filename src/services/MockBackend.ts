import AsyncStorage from '@react-native-async-storage/async-storage';
import { MemberTier, Transaction, UserProfile } from '../types/types';

const STORAGE_KEYS = {
  USER: 'gc_user_profile',
  TRANSACTIONS: 'gc_transactions',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveTier = (lifetimePoints: number): MemberTier => {
  if (lifetimePoints >= 5000) return 'Platinum';
  if (lifetimePoints >= 1000) return 'Gold';
  return 'Silver';
};

export const MockBackend = {
  POINT_CONVERSION: 100,
  TIER_MILESTONES: {
    Gold: 1000,
    Platinum: 5000,
  },

  async getUser(): Promise<UserProfile | null> {
    await sleep(500);
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  },

  async initUser(phoneNumber: string): Promise<UserProfile> {
    await sleep(500);
    const existing = await this.getUser();
    if (existing) return existing;

    const sanitizedPhone = phoneNumber.trim() || '8123456789';
    const user: UserProfile = {
      id: `user_${sanitizedPhone}`,
      name: 'Ferry Rusly',
      phoneNumber: sanitizedPhone,
      currentPoints: 350,
      lifetimePoints: 350,
      tier: 'Silver',
    };

    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    return user;
  },

  async addTransaction(amount: number): Promise<UserProfile> {
    await sleep(500);

    let user = await this.getUser();
    if (!user) {
      user = await this.initUser('8123456789');
    }

    const pointsEarned = Math.floor(Math.max(0, amount) / this.POINT_CONVERSION);
    const updatedUser: UserProfile = {
      ...user,
      currentPoints: user.currentPoints + pointsEarned,
      lifetimePoints: user.lifetimePoints + pointsEarned,
      tier: resolveTier(user.lifetimePoints + pointsEarned),
    };

    const rawTransactions = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    let transactions: Transaction[] = [];
    if (rawTransactions) {
      try {
        transactions = JSON.parse(rawTransactions) as Transaction[];
      } catch {
        transactions = [];
      }
    }

    const nextTransaction: Transaction = {
      id: `trx_${Date.now()}`,
      date: new Date().toISOString(),
      amount,
      pointsEarned,
    };

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER, JSON.stringify(updatedUser)],
      [STORAGE_KEYS.TRANSACTIONS, JSON.stringify([nextTransaction, ...transactions])],
    ]);

    return updatedUser;
  },

  async resetData(): Promise<void> {
    await sleep(500);
    await AsyncStorage.clear();
  },
};

export default MockBackend;
