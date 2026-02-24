    // ...existing code...
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { UserProfile, MemberTier, XpRecord, RewardItem, UserVoucher } from '../types/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RULES = {
  CONVERSION_RATE: 100, // 1 XP = Rp 100
  TIER_LIMITS: {
    Silver: 0,
    Gold: 5000,
    Platinum: 15000,
  },
  XP_VALIDITY_DAYS: 365,
// ...existing code...
  // --- UPDATE USER PROFILE (PATCH) ---
  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) throw new Error('User not found');
    const userRef = doc(firestoreDb, 'users', currentUser.uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) throw new Error('User profile not found');
    const data = snapshot.data() as UserProfile;
    const updatedProfile: UserProfile = {
      ...data,
      ...updates,
    };
    await setDoc(userRef, updatedProfile, { merge: true });
    return updatedProfile;
  },
};

const REWARD_CATALOG: RewardItem[] = [
  {
    id: 'r1',
    title: 'Free Milk Tea',
    description: 'Medium size. Classic favorite.',
    pointsCost: 500,
    image: require('../../assets/images/voucherdrink1.png'),
    category: 'Drink',
  },
  {
    id: 'r2',
    title: 'Free Pearl',
    description: 'Add chewy pearl topping to any drink.',
    pointsCost: 200,
    image: require('../../assets/images/boba.webp'),
    category: 'Topping',
  },
  {
    id: 'r3',
    title: 'Rp 20.000 Discount',
    description: 'Min. spend Rp 50.000.',
    pointsCost: 800,
    image: require('../../assets/images/voucher20k.png'),
    category: 'Discount',
  },
  {
    id: 'r4',
    title: 'Free Gongcha Tea',
    description: 'Large size with fresh milk.',
    pointsCost: 1200,
    image: require('../../assets/images/voucherdrink2.png'),
    category: 'Drink',
  },
];

export const MockBackend = {
  POINT_CONVERSION: RULES.CONVERSION_RATE,
  TIER_MILESTONES: {
    Gold: RULES.TIER_LIMITS.Gold,
    Platinum: RULES.TIER_LIMITS.Platinum,
  },

  // --- INTERNAL: HITUNG TIER ---
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

  // --- INTERNAL: NORMALIZE & PRESERVE ROLES (FIXED) ---
  _normalizeUserProfile(user: Partial<UserProfile>, fallback: { id: string; name: string; phoneNumber: string }): UserProfile {
    const normalizedHistory = (user.xpHistory || []).map((record) => ({
      ...record,
      type: record.type || 'earn',
      context: record.context || ((record.type || 'earn') === 'redeem' ? 'Reward Redeem' : 'Drink Purchase'),
      location: record.location || 'Gong Cha App',
      tierEligible: record.tierEligible ?? ((record.type || 'earn') === 'earn'),
    }));

    // --- SECURITY: ROLE LOGIC ---
    const ADMIN_UIDS = ['qIyNEH8XywdBubH5PugI5qQTwc53']; 
    const isHardcodedAdmin = ADMIN_UIDS.includes(fallback.id);
    
    // Perbaikan: Gunakan role yang ada di DB, jika tidak ada baru member.
    // Memastikan 'trial' dan 'master' tidak dibuang.
    let determinedRole = user.role || 'member';

    if (isHardcodedAdmin) {
      determinedRole = 'admin';
    } else if (!['master', 'trial', 'admin', 'member'].includes(determinedRole)) {
      determinedRole = 'member';
    }

    const base: UserProfile = {
      id: user.id || fallback.id,
      name: user.name || fallback.name,
      phoneNumber: user.phoneNumber || fallback.phoneNumber,
      email: user.email,     
      photoURL: user.photoURL,
      currentPoints: user.currentPoints ?? 0,
      lifetimePoints: user.lifetimePoints ?? user.currentPoints ?? 0,
      tierXp: user.tierXp ?? 0,
      xpHistory: normalizedHistory,
      tier: user.tier || 'Silver',
      joinedDate: user.joinedDate || new Date().toISOString(),
      vouchers: user.vouchers || [],
      role: determinedRole as any, 
    };

    const { activeXp, newTier, activeRecords } = this._calculateTierStatus(base.xpHistory);

    return {
      ...base,
      tierXp: activeXp,
      tier: newTier,
      xpHistory: activeRecords,
    };
  },

  // --- GET USER DATA ---
  async getUser(): Promise<UserProfile | null> {
    await delay(120);
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return null;

    const userRef = doc(firestoreDb, 'users', currentUser.uid);
    const snapshot = await getDoc(userRef);

    // Jika dokumen tidak ada, buat fallback tapi JANGAN paksa role member jika ini trial
    if (!snapshot.exists()) {
      const phoneFromEmail = currentUser.email?.split('@')[0] || '8123456789';
      const fallbackIdentity = {
          id: currentUser.uid,
          name: currentUser.displayName || 'Member',
          phoneNumber: phoneFromEmail
      };
      
      const tempUser: UserProfile = {
        ...fallbackIdentity,
        currentPoints: 0,
        lifetimePoints: 0,
        tierXp: 0,
        xpHistory: [],
        tier: 'Silver',
        joinedDate: new Date().toISOString(),
        vouchers: [],
        role: 'trial', // Default fallback untuk login baru kita set ke trial/member sesuai keinginan
      };
      
      return this._normalizeUserProfile(tempUser, fallbackIdentity);
    }

    const data = snapshot.data() as UserProfile;
    const normalizedData = this._normalizeUserProfile(data, {
        id: currentUser.uid,
        name: data.name,
        phoneNumber: data.phoneNumber
    });
    
    // Sinkronisasi ke DB jika role berubah (misal dari member ke admin via UID)
    if (data.role !== normalizedData.role || data.id !== currentUser.uid) {
      await setDoc(userRef, normalizedData, { merge: true });
    }
    
    return normalizedData;
  },

  async initUser(phoneNumber: string, forcedRole?: string): Promise<UserProfile> {
    await delay(120);
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Auth required');

    const userRef = doc(firestoreDb, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (snapshot.exists()) {
      return this._normalizeUserProfile(snapshot.data() as UserProfile, {
        id: user.uid,
        name: user.displayName || 'Member',
        phoneNumber: phoneNumber
      });
    }

    // Buat User Baru
    const newUser: UserProfile = {
      id: user.uid,
      name: user.displayName || 'Member',
      phoneNumber: phoneNumber,
      currentPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      xpHistory: [],
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      vouchers: [],
      role: (forcedRole as any) || 'trial', 
    };
    
    await setDoc(userRef, newUser);
    return newUser;
  },

  // ... (Sisa fungsi addTransaction, redeemReward, dll tetap sama)
  async addTransaction(amount: number): Promise<UserProfile> {
    await delay(180);
    const user = await this.getUser();
    if (!user) throw new Error('User not found');
    const earnedVal = Math.floor(amount / RULES.CONVERSION_RATE);

    const newXpRecord: XpRecord = {
      id: `xp_${Date.now()}`,
      date: new Date().toISOString(),
      amount: earnedVal,
      type: 'earn',
      context: amount >= 50000 ? 'Drink Purchase' : 'Admin Top Up',
      location: 'Gong Cha App',
      tierEligible: true,
    };
    
    const { activeXp, newTier, activeRecords } = this._calculateTierStatus([...user.xpHistory, newXpRecord]);

    const updatedUser: UserProfile = {
      ...user,
      currentPoints: user.currentPoints + earnedVal,
      lifetimePoints: (user.lifetimePoints || 0) + earnedVal,
      tierXp: activeXp,
      tier: newTier,
      xpHistory: activeRecords,
    };

    await setDoc(doc(firestoreDb, 'users', user.id), updatedUser, { merge: true });
    return updatedUser;
  },

  async resetData(): Promise<void> {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return;
    await deleteDoc(doc(firestoreDb, 'users', currentUser.uid));
  },
};

export default MockBackend;