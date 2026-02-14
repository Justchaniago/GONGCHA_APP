import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, MemberTier, XpRecord, RewardItem, UserVoucher } from '../types/types';

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

const REWARD_CATALOG: RewardItem[] = [
  {
    id: 'r1',
    title: 'Free Pearl Milk Tea',
    description: 'Medium size. Classic favorite.',
    pointsCost: 500,
    image: require('../../assets/images/drink1.png'),
    category: 'Drink',
  },
  {
    id: 'r2',
    title: 'Free Topping: Pudding',
    description: 'Add silky pudding to any drink.',
    pointsCost: 200,
    image: require('../../assets/images/boba.png'),
    category: 'Topping',
  },
  {
    id: 'r3',
    title: 'Rp 20.000 Discount',
    description: 'Min. spend Rp 50.000.',
    pointsCost: 800,
    image: require('../../assets/images/promo1.png'),
    category: 'Discount',
  },
  {
    id: 'r4',
    title: 'Signature Brown Sugar',
    description: 'Large size with fresh milk.',
    pointsCost: 1200,
    image: require('../../assets/images/drink3.png'),
    category: 'Drink',
  },
];

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
    const activeXp = activeRecords.reduce((sum, record) => {
      const isEarnEvent = (record.type || 'earn') === 'earn';
      const includeForTier = record.tierEligible !== false;
      if (!isEarnEvent || !includeForTier) return sum;
      return sum + Math.max(0, record.amount);
    }, 0);

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
    if (existing) {
      const parsed = JSON.parse(existing) as Partial<UserProfile>;
      const hydrated: UserProfile = {
        id: parsed.id || `u_${Date.now()}`,
        name: parsed.name || 'Ferry Rusly',
        phoneNumber: parsed.phoneNumber || phoneNumber || '8123456789',
        currentPoints: parsed.currentPoints ?? 0,
        lifetimePoints: parsed.lifetimePoints ?? parsed.currentPoints ?? 0,
        tierXp: parsed.tierXp ?? 0,
        xpHistory: parsed.xpHistory || [],
        tier: parsed.tier || 'Silver',
        joinedDate: parsed.joinedDate || new Date().toISOString(),
        vouchers: parsed.vouchers || [],
      };

      if (
        hydrated.lifetimePoints !== parsed.lifetimePoints ||
        !Array.isArray(parsed.vouchers)
      ) {
        await AsyncStorage.setItem(DB_KEY_USER, JSON.stringify(hydrated));
      }

      return hydrated;
    }

    const newUser: UserProfile = {
      id: `u_${Date.now()}`,
      name: 'Ferry Rusly',
      phoneNumber: phoneNumber || '8123456789',
      currentPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      xpHistory: [],
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      vouchers: [],
    };

    await AsyncStorage.setItem(DB_KEY_USER, JSON.stringify(newUser));
    return newUser;
  },

  async getUser(): Promise<UserProfile | null> {
    await delay(300);
    const data = await AsyncStorage.getItem(DB_KEY_USER);
    if (!data) return null;

    let user = JSON.parse(data) as Partial<UserProfile>;
    const normalizedHistory = (user.xpHistory || []).map((record) => ({
      ...record,
      type: record.type || 'earn',
      context: record.context || ((record.type || 'earn') === 'redeem' ? 'Reward Redeem' : 'Drink Purchase'),
      location: record.location || 'Gong Cha App',
      tierEligible: record.tierEligible ?? ((record.type || 'earn') === 'earn'),
    }));

    const normalizedUser: UserProfile = {
      id: user.id || `u_${Date.now()}`,
      name: user.name || 'Ferry Rusly',
      phoneNumber: user.phoneNumber || '8123456789',
      currentPoints: user.currentPoints ?? 0,
      lifetimePoints: user.lifetimePoints ?? user.currentPoints ?? 0,
      tierXp: user.tierXp ?? 0,
      xpHistory: normalizedHistory,
      tier: user.tier || 'Silver',
      joinedDate: user.joinedDate || new Date().toISOString(),
      vouchers: user.vouchers || [],
    };
    const { activeXp, newTier, activeRecords } = this._calculateTierStatus(normalizedHistory);

    if (
      normalizedUser.tierXp !== activeXp ||
      normalizedUser.tier !== newTier ||
      activeRecords.length !== (normalizedUser.xpHistory || []).length ||
      normalizedUser.lifetimePoints !== (user.lifetimePoints ?? user.currentPoints ?? 0) ||
      !Array.isArray(user.vouchers)
    ) {
      const updatedUser: UserProfile = {
        ...normalizedUser,
        tierXp: activeXp,
        tier: newTier,
        xpHistory: activeRecords,
      };
      await AsyncStorage.setItem(DB_KEY_USER, JSON.stringify(updatedUser));
      return updatedUser;
    }

    return normalizedUser;
  },

  async getCatalog(): Promise<RewardItem[]> {
    await delay(300);
    return REWARD_CATALOG;
  },

  async addTransaction(amount: number): Promise<UserProfile> {
    await delay(800);
    const userStr = await AsyncStorage.getItem(DB_KEY_USER);
    if (!userStr) throw new Error('User not found');

    let user = JSON.parse(userStr) as UserProfile;
    const earnedVal = Math.floor(amount / RULES.CONVERSION_RATE);
    const safeLifetimePoints = user.lifetimePoints ?? user.currentPoints ?? 0;

    user.currentPoints += earnedVal;
    user.lifetimePoints = safeLifetimePoints + earnedVal;
    user.vouchers = user.vouchers || [];

    const newXpRecord: XpRecord = {
      id: `xp_${Date.now()}`,
      date: new Date().toISOString(),
      amount: earnedVal,
      type: 'earn',
      context: amount >= 50000 ? 'Drink Purchase' : 'Top Up Purchase',
      location: 'Gong Cha Central Park',
      tierEligible: true,
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

  async redeemReward(rewardId: string): Promise<UserProfile> {
    await delay(800);
    const userStr = await AsyncStorage.getItem(DB_KEY_USER);
    if (!userStr) throw new Error('User not found');

    const user = JSON.parse(userStr) as UserProfile;
    const safeUser: UserProfile = {
      ...user,
      lifetimePoints: user.lifetimePoints ?? user.currentPoints ?? 0,
      vouchers: user.vouchers || [],
    };
    const reward = REWARD_CATALOG.find((catalogItem) => catalogItem.id === rewardId);

    if (!reward) {
      throw new Error('Reward tidak ditemukan');
    }

    if (safeUser.currentPoints < reward.pointsCost) {
      throw new Error('Poin tidak cukup untuk menukar hadiah ini.');
    }

    const newVoucher: UserVoucher = {
      id: `v_${Date.now()}`,
      rewardId: reward.id,
      title: reward.title,
      code: `GC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      redeemedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isUsed: false,
    };

    const redeemHistory: XpRecord = {
      id: `xp_redeem_${Date.now()}`,
      date: new Date().toISOString(),
      amount: reward.pointsCost,
      type: 'redeem',
      context: reward.title,
      location: 'Rewards Catalog',
      tierEligible: false,
    };

    const updatedUser: UserProfile = {
      ...safeUser,
      currentPoints: safeUser.currentPoints - reward.pointsCost,
      xpHistory: [...(safeUser.xpHistory || []), redeemHistory],
      vouchers: [newVoucher, ...safeUser.vouchers],
    };

    await AsyncStorage.setItem(DB_KEY_USER, JSON.stringify(updatedUser));
    return updatedUser;
  },

  async getVoucherCheckoutPayload(voucherId: string): Promise<string> {
    await delay(250);
    const user = await this.getUser();
    if (!user) {
      throw new Error('User not found');
    }

    const voucher = (user.vouchers || []).find((item) => item.id === voucherId);
    if (!voucher) {
      throw new Error('Voucher tidak ditemukan');
    }

    if (voucher.isUsed) {
      throw new Error('Voucher sudah digunakan');
    }

    if (new Date(voucher.expiresAt).getTime() < Date.now()) {
      throw new Error('Voucher sudah kedaluwarsa');
    }

    return JSON.stringify({
      type: 'GONGCHA_VOUCHER',
      voucherId: voucher.id,
      rewardId: voucher.rewardId,
      code: voucher.code,
      userId: user.id,
      issuedAt: new Date().toISOString(),
      nonce: Math.random().toString(36).slice(2, 12),
    });
  },

  async markVoucherUsed(voucherId: string): Promise<UserProfile> {
    await delay(500);
    const userStr = await AsyncStorage.getItem(DB_KEY_USER);
    if (!userStr) {
      throw new Error('User not found');
    }

    const user = JSON.parse(userStr) as UserProfile;
    const vouchers = user.vouchers || [];
    const targetIndex = vouchers.findIndex((item) => item.id === voucherId);

    if (targetIndex < 0) {
      throw new Error('Voucher tidak ditemukan');
    }

    const targetVoucher = vouchers[targetIndex];
    if (targetVoucher.isUsed) {
      throw new Error('Voucher sudah digunakan');
    }

    if (new Date(targetVoucher.expiresAt).getTime() < Date.now()) {
      throw new Error('Voucher sudah kedaluwarsa');
    }

    const updatedVouchers = [...vouchers];
    updatedVouchers[targetIndex] = {
      ...targetVoucher,
      isUsed: true,
    };

    const updatedUser: UserProfile = {
      ...user,
      vouchers: updatedVouchers,
    };

    await AsyncStorage.setItem(DB_KEY_USER, JSON.stringify(updatedUser));
    return updatedUser;
  },

  async redeemPoints(cost: number): Promise<UserProfile> {
    const userStr = await AsyncStorage.getItem(DB_KEY_USER);
    if (!userStr) throw new Error('User not found');
    const user = JSON.parse(userStr) as UserProfile;

    if (user.currentPoints < cost) throw new Error('Poin tidak cukup');

    const redeemHistory: XpRecord = {
      id: `xp_redeem_${Date.now()}`,
      date: new Date().toISOString(),
      amount: cost,
      type: 'redeem',
      context: 'Point Redemption',
      location: 'Gong Cha App',
      tierEligible: false,
    };

    const updatedUser: UserProfile = {
      ...user,
      currentPoints: user.currentPoints - cost,
      xpHistory: [...(user.xpHistory || []), redeemHistory],
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
