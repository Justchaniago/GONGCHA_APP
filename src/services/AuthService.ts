import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
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

  // ─── LOGIN VIA EMAIL + PASSWORD (real email) ──────────────────────────────
  async loginWithEmail(email: string, password: string): Promise<UserProfile> {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const user = userCredential.user;

    const profile = await UserService.getUserProfile();
    if (profile) return profile;

    // Buat profil default jika belum ada di Firestore
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
    };

    await setDoc(doc(firestoreDb, 'users', user.uid), newProfile);
    return newProfile;
  },

  // ─── KIRIM EMAIL RESET PASSWORD ───────────────────────────────────────────
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(firebaseAuth, email);
  },

  // ─── LOGOUT ───────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    await signOut(firebaseAuth);
  },
};
