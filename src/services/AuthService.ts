import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  signOut,
  applyActionCode,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { UserProfile } from '../types/types';
import { UserService } from './UserService';

export const AuthService = {
  // ─── LOGIN VIA PHONE (mapped to fake email) ───────────────────────────────
  async login(email: string, pass: string): Promise<UserProfile> {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, pass);
    const user = userCredential.user;

    const profile = await UserService.getUserProfile();
    if (profile) return profile;

    // Jika belum ada doc Firestore, buat default
    const newProfile: UserProfile = {
      id: user.uid,
      name: user.displayName || 'Member',
      phoneNumber: email.split('@')[0],
      currentPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      xpHistory: [],
      vouchers: [],
      role: 'member',
    };

    await setDoc(doc(firestoreDb, 'users', user.uid), newProfile);
    return newProfile;
  },

  // ─── REGISTER VIA PHONE (mapped to fake email) ────────────────────────────
  async register(
    email: string,
    pass: string,
    name: string,
    phone: string,
  ): Promise<UserProfile> {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
    const user = userCredential.user;

    // Update displayName di Firebase Auth
    await updateProfile(user, { displayName: name });

    const newProfile: UserProfile = {
      id: user.uid,
      name,
      phoneNumber: phone,
      currentPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      xpHistory: [],
      vouchers: [],
      role: 'member',
    };

    await setDoc(doc(firestoreDb, 'users', user.uid), newProfile);
    return newProfile;
  },

  // ─── REGISTER VIA EMAIL + PASSWORD (real email) ───────────────────────────
  async registerWithEmail(
    email: string,
    password: string,
    name: string,
    phone?: string,
  ): Promise<UserProfile> {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    // 📧 Kirim email verifikasi setelah registrasi
    await sendEmailVerification(user);

    const newProfile: UserProfile = {
      id: user.uid,
      name,
      email,
      phoneNumber: phone || '',
      currentPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      xpHistory: [],
      vouchers: [],
      role: 'member',
      emailVerified: false,
    };

    await setDoc(doc(firestoreDb, 'users', user.uid), newProfile);

    // Sign out immediately — user must verify email before using the app
    await signOut(firebaseAuth);

    return newProfile;
  },

  // ─── LOGIN VIA EMAIL + PASSWORD — blok jika belum verifikasi ─────────────
  async loginWithEmail(email: string, password: string): Promise<UserProfile> {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const user = userCredential.user;

    // Reload untuk mendapatkan status emailVerified terbaru dari Firebase
    await user.reload();

    if (!user.emailVerified) {
      await signOut(firebaseAuth);
      throw new Error('email_not_verified');
    }

    const profile = await UserService.getUserProfile();
    if (profile) {
      // Update emailVerified di Firestore jika belum ter-update
      if (!(profile as any).emailVerified) {
        await setDoc(doc(firestoreDb, 'users', user.uid), { emailVerified: true }, { merge: true });
      }
      return profile;
    }

    const newProfile: UserProfile = {
      id: user.uid,
      name: user.displayName || email.split('@')[0],
      email: user.email || email,
      phoneNumber: '',
      currentPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      xpHistory: [],
      vouchers: [],
      role: 'member',
      emailVerified: true,
    };

    await setDoc(doc(firestoreDb, 'users', user.uid), newProfile);
    return newProfile;
  },

  // ─── KIRIM ULANG EMAIL VERIFIKASI ─────────────────────────────────────────
  async resendVerificationEmail(email: string, password: string): Promise<void> {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    await sendEmailVerification(userCredential.user);
    await signOut(firebaseAuth);
  },

  // ─── KIRIM EMAIL RESET PASSWORD (Magic Link) ──────────────────────────────
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(firebaseAuth, email);
  },

  // ─── KONFIRMASI RESET PASSWORD via oobCode (dari magic link) ─────────────
  async confirmPasswordReset(oobCode: string, newPassword: string): Promise<void> {
    await firebaseConfirmPasswordReset(firebaseAuth, oobCode, newPassword);
  },

  // ─── APPLY ACTION CODE (verifikasi email in-app) ─────────────────────────
  async applyEmailVerificationCode(oobCode: string): Promise<void> {
    await applyActionCode(firebaseAuth, oobCode);
    await firebaseAuth.currentUser?.reload();
  },

  // ─── GANTI PASSWORD (untuk user yang sudah login) ─────────────────────────
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = firebaseAuth.currentUser;
    if (!user || !user.email) throw new Error('Tidak ada user yang login.');

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await firebaseUpdatePassword(user, newPassword);
  },

  // ─── LOGOUT ───────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    await signOut(firebaseAuth);
  },
};
