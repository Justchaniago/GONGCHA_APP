import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, deleteDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { UserProfile, XpRecord, UserVoucher, MemberTier } from '../types/types';

const TIER_LIMITS = { Silver: 0, Gold: 5000, Platinum: 15000 };

export const UserService = {
  // --- AMBIL DATA PROFILE ---
  async getUserProfile(): Promise<UserProfile | null> {
    const user = firebaseAuth.currentUser;
    if (!user) return null;

    const docRef = doc(firestoreDb, 'users', user.uid);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      return snapshot.data() as UserProfile;
    }
    return null;
  },

  // --- UPDATE PROFILE (Ganti Nama/Foto) ---
  async updateProfile(updates: Partial<UserProfile>) {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const docRef = doc(firestoreDb, 'users', user.uid);
    await updateDoc(docRef, updates);
  },

  // --- TAMBAH TRANSAKSI (POIN) ---
  async addTransaction(amount: number) {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('User not found');

    const pointsEarned = Math.floor(amount / 100);
    const userRef = doc(firestoreDb, 'users', user.uid);

    const newRecord: XpRecord = {
      id: `trx_${Date.now()}`,
      date: new Date().toISOString(),
      amount: pointsEarned,
      type: 'earn',
      context: 'Purchase',
      location: 'Store',
      tierEligible: true
    };

    // Update Poin & History secara atomik
    await updateDoc(userRef, {
      currentPoints: increment(pointsEarned),
      lifetimePoints: increment(pointsEarned),
      xpHistory: arrayUnion(newRecord)
    });

    // Cek Level Up setelah poin bertambah
    await this.refreshTierStatus();
  },

  // --- LOGIKA TIER (LEVEL UP) ---
  async refreshTierStatus() {
    const profile = await this.getUserProfile();
    if (!profile) return;

    let newTier: MemberTier = 'Silver';
    if (profile.lifetimePoints >= TIER_LIMITS.Platinum) newTier = 'Platinum';
    else if (profile.lifetimePoints >= TIER_LIMITS.Gold) newTier = 'Gold';

    if (newTier !== profile.tier) {
      const userRef = doc(firestoreDb, 'users', profile.id);
      await updateDoc(userRef, { tier: newTier });
    }
  },

  // --- REDEEM VOUCHER ---
  async redeemVoucher(reward: any) {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('User not found');

    const newVoucher: UserVoucher = {
      id: `v_${Date.now()}`,
      rewardId: reward.id,
      title: reward.title,
      code: `GC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      redeemedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isUsed: false,
    };

    const userRef = doc(firestoreDb, 'users', user.uid);
    await updateDoc(userRef, {
      currentPoints: increment(-reward.pointsCost),
      vouchers: arrayUnion(newVoucher)
    });
    return newVoucher;
  },

  // --- GENERATE QR PAYLOAD ---
  async getVoucherCheckoutPayload(voucher: UserVoucher) {
    // Payload bisa diubah sesuai kebutuhan backend kasir
    return JSON.stringify({
      code: voucher.code,
      userId: firebaseAuth.currentUser?.uid,
      voucherId: voucher.id,
      rewardId: voucher.rewardId,
      expiresAt: voucher.expiresAt,
    });
  },

  // --- MARK VOUCHER AS USED ---
  async markVoucherUsed(voucherId: string) {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('User not found');
    const userRef = doc(firestoreDb, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error('User not found');
    const userData = userSnap.data() as UserProfile;
    const updatedVouchers = (userData.vouchers || []).map((v) =>
      v.id === voucherId ? { ...v, isUsed: true } : v
    );
    await updateDoc(userRef, { vouchers: updatedVouchers });
    return updatedVouchers;
  },
};