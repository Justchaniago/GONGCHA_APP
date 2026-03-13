import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { UserProfile, UserVoucher } from '../types/types';

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

  // --- REDEEM VOUCHER (Request) ---
  // Catatan God Schema: Pengurangan poin idealnya dilakukan via Cloud Functions backend
  // Untuk saat ini, kita hanya memasukkan voucher ke array (diizinkan oleh rules)
  async redeemVoucher(reward: any) {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('User not found');

    const newVoucher: UserVoucher = {
      id: `v_${Date.now()}`,
      rewardId: reward.id,
      title: reward.title,
      code: `GC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isUsed: false,
    };

    const userRef = doc(firestoreDb, 'users', user.uid);
    
    // PERBAIKAN: Kita hapus currentPoints: increment(-reward.pointsCost) 
    // karena rules memblokir customer mengubah poinnya sendiri.
    await updateDoc(userRef, {
      vouchers: arrayUnion(newVoucher)
    });
    
    return newVoucher;
  },

  // --- GENERATE QR PAYLOAD ---
  async getVoucherCheckoutPayload(voucher: UserVoucher) {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) throw new Error("User belum login");

    return `VOUCHER:${userId}:${voucher.code}`;
  }
};