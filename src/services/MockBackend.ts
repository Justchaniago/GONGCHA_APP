import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, MemberTier, XpRecord } from '../types/types';

const DB_KEY_USER = '@gongcha_user_v2';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RULES = {
  CONVERSION_RATE: 100,
  TIER_LIMITS: {
    Silver: 0,
    Gold: 5000,
    Platinum: 15000,
  },
  XP_VALIDITY_DAYS: 365,
};

export const MockBackend = {
  POINT_CONVERSION: RULES.CONVERSION_RATE,
  TIER_MILESTONES: {
    Gold: RULES.TIER_LIMITS.Gold,
    Platinum: RULES.TIER_LIMITS.Platinum,
  },

  _calculateTierStatus(xpHistory: XpRecord[]): { activeXp: number; newTier: MemberTier; activeRecords: XpRecord[] } {
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - RULES.XP_VALIDITY_DAYS);

    const activeRecords = xpHistory.filter((record) => new Date(record.date) > cutoffDate);
    const activeXp = activeRecords.reduce((sum, record) => sum + record.amount, 0);

    let newTier: MemberTier = 'Silver';
    if (activeXp >= RULES.TIER_LIMITS.Platinum) {
      newTier = 'Platinum';
    } else if (activeXp >= RULES.TIER_LIMITS.Gold) {
      newTier = 'Gold';
    }

    return { activeXp, newTier, activeRecords };
  },

  async initUser(phoneNumber: string): Promise<UserProfile> {
    await delay(500);
    const existing = await AsyncStorage.getItem(DB_KEY_USER);
    if (existing) return JSON.parse(existing) as UserProfile;

    const newUser: UserProfile = {
      id: `u_${Date.now()}`,
      name: 'Ferry Rusly',
      phoneNumber: phoneNumber || '8123456789',
      currentPoints: 0,
      tierXp: 0,
      xpHistory: [],
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
    };

    await AsyncStorage.setItem(DB_KEY_USER, JSON.stringify(newUser));
    return newUser;
  },

  async getUser(): Promise<UserProfile | null> {
    await delay(300);
    const data = await AsyncStorage.getItem(DB_KEY_USER);
    if (!data) return null;

    let user = JSON.parse(data) as UserProfile;
    const { activeXp, newTier, activeRecords } = this._calculateTierStatus(user.xpHistory || []);

    if (user.tierXp !== activeXp || user.tier !== newTier || activeRecords.length !== (user.xpHistory || []).length) {
      user = {
        ...user,
        tierXp: activeXp,
        tier: newTier,
        xpHistory: activeRecords,
      };
      await AsyncStorage.setItem(DB_KEY_USER, JSON.stringify(user));
    }

    return user;
  },

  async addTransaction(amount: number): Promise<UserProfile> {
    await delay(800);
    const userStr = await AsyncStorage.getItem(DB_KEY_USER);
    if (!userStr) throw new Error('User not found');

    let user = JSON.parse(userStr) as UserProfile;
    const earnedVal = Math.floor(amount / RULES.CONVERSION_RATE);

    user.currentPoints += earnedVal;

    const newXpRecord: XpRecord = {
      id: `xp_${Date.now()}`,
      date: new Date().toISOString(),
      amount: earnedVal,
    };
    user.xpHistory.push(newXpRecord);

    const { activeXp, newTier, activeRecords } = this._calculateTierStatus(user.xpHistory);
    const updatedUser: UserProfile = {
      ...user,
      tierXp: activeXp,
      tier: newTier,
      xpHistory: activeRecords,
    };

    await AsyncStorage.setItem(DB_KEY_USER, JSON.stringify(updatedUser));
    return updatedUser;
  },

  async redeemPoints(cost: number): Promise<UserProfile> {
    const userStr = await AsyncStorage.getItem(DB_KEY_USER);
    if (!userStr) throw new Error('User not found');
    const user = JSON.parse(userStr) as UserProfile;

    if (user.currentPoints < cost) throw new Error('Poin tidak cukup');

    const updatedUser: UserProfile = {
      ...user,
      currentPoints: user.currentPoints - cost,
    };

    await AsyncStorage.setItem(DB_KEY_USER, JSON.stringify(updatedUser));
    return updatedUser;
  },

  async resetData(): Promise<void> {
    await delay(500);
    await AsyncStorage.removeItem(DB_KEY_USER);
  },
};

export default MockBackend;
