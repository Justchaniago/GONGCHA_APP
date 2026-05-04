import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { UserProfile, UserVoucher } from '../types/types';
import { BackendApi } from './BackendApi';

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
    
    // Frontend hanya diizinkan update field dasar, bukan points/tier!
    const docRef = doc(firestoreDb, 'users', user.uid);
    await updateDoc(docRef, updates);
  },

  // --- REDEEM VOUCHER (via Backend API) ---
  // Points deduction + voucher creation now atomic on backend
  async redeemVoucher(reward: any) {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('User not found');

    // Call backend API (atomic: deduct points + create voucher)
    const response = await BackendApi.redeemVoucher(reward.id);

    // Backend returns created voucher
    return response.voucher as UserVoucher;
  },

  // --- GENERATE QR PAYLOAD ---
  async getVoucherCheckoutPayload(voucher: UserVoucher) {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) throw new Error("User belum login");

    return `VOUCHER:${userId}:${voucher.code}`;
  }
};