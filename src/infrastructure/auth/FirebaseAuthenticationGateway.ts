import {
  EmailAuthProvider,
  applyActionCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as firebaseUpdatePassword,
  updateProfile,
  type Auth,
} from 'firebase/auth';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

import type { AuthProfile } from '../../application/auth/AuthProfile';
import type { AuthenticationGateway } from '../../application/ports/auth/AuthenticationGateway';

export class FirebaseAuthenticationGateway
  implements AuthenticationGateway
{
  constructor(
    private readonly auth: Auth,
    private readonly database: Firestore,
  ) {}

  private async getCurrentProfile(): Promise<AuthProfile | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    const snapshot = await getDoc(doc(this.database, 'users', user.uid));
    return snapshot.exists() ? (snapshot.data() as AuthProfile) : null;
  }

  async loginWithPhoneAlias(
    email: string,
    password: string,
  ): Promise<AuthProfile> {
    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    const profile = await this.getCurrentProfile();
    if (profile) return profile;

    const newProfile: AuthProfile = {
      uid: credential.user.uid,
      name: credential.user.displayName || 'Member',
      phoneNumber: email.split('@')[0],
      currentPoints: 0,
      pendingPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      vouchers: [],
      role: 'member',
    };
    await setDoc(
      doc(this.database, 'users', credential.user.uid),
      newProfile,
    );
    return newProfile;
  }

  async registerWithPhoneAlias(
    email: string,
    password: string,
    name: string,
    phone: string,
  ): Promise<AuthProfile> {
    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    await updateProfile(credential.user, { displayName: name });
    const newProfile: AuthProfile = {
      uid: credential.user.uid,
      name,
      phoneNumber: phone,
      currentPoints: 0,
      pendingPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      vouchers: [],
      role: 'member',
      profileComplete: false,
    };
    await setDoc(
      doc(this.database, 'users', credential.user.uid),
      newProfile,
    );
    return newProfile;
  }

  async registerWithEmail(
    email: string,
    password: string,
    name: string,
    phone?: string,
  ): Promise<AuthProfile> {
    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    await updateProfile(credential.user, { displayName: name });
    await sendEmailVerification(credential.user);
    await signOut(this.auth);
    return {
      uid: credential.user.uid,
      name,
      email,
      phoneNumber: phone || '',
      currentPoints: 0,
      pendingPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      vouchers: [],
      role: 'member',
      emailVerified: false,
    };
  }

  async loginWithEmail(
    email: string,
    password: string,
  ): Promise<AuthProfile> {
    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    const user = credential.user;
    await user.getIdToken(true);
    await user.reload();
    if (!user.emailVerified) {
      await signOut(this.auth);
      throw new Error('email_not_verified');
    }

    const profile = await this.getCurrentProfile();
    if (profile) {
      if (!profile.emailVerified) {
        await setDoc(
          doc(this.database, 'users', user.uid),
          { emailVerified: true },
          { merge: true },
        );
      }
      return profile;
    }

    const newProfile = this.newVerifiedEmailProfile(
      user.uid,
      user.displayName,
      user.email || email,
    );
    await setDoc(doc(this.database, 'users', user.uid), newProfile);
    return newProfile;
  }

  async resendVerificationEmail(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    await sendEmailVerification(credential.user);
    await signOut(this.auth);
  }

  sendPasswordReset(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  confirmPasswordReset(oobCode: string, newPassword: string) {
    return firebaseConfirmPasswordReset(this.auth, oobCode, newPassword);
  }

  async applyEmailVerificationCode(oobCode: string) {
    await applyActionCode(this.auth, oobCode);
    await this.auth.currentUser?.reload();
  }

  async autoLoginAfterEmailVerification(
    email: string,
    password: string,
  ): Promise<AuthProfile> {
    const credential = await signInWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    const user = credential.user;
    await user.reload();
    if (!user.emailVerified) {
      await signOut(this.auth);
      throw new Error('Email belum diverifikasi. Periksa inbox kamu.');
    }

    const profile = await this.getCurrentProfile();
    if (profile) {
      if (!profile.profileComplete) {
        await setDoc(
          doc(this.database, 'users', user.uid),
          { profileComplete: false },
          { merge: true },
        );
      }
      return { ...profile, profileComplete: false };
    }

    const newProfile = this.newVerifiedEmailProfile(
      user.uid,
      user.displayName,
      user.email || email,
    );
    await setDoc(doc(this.database, 'users', user.uid), newProfile);
    return newProfile;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Tidak ada user yang login.');
    }
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, currentPassword),
    );
    await firebaseUpdatePassword(user, newPassword);
  }

  logout() {
    return signOut(this.auth);
  }

  currentSubject() {
    return this.auth.currentUser?.uid ?? null;
  }

  currentIdentity() {
    const user = this.auth.currentUser;
    return user
      ? {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          providerIds: user.providerData.map((provider) => provider.providerId),
        }
      : null;
  }

  private newVerifiedEmailProfile(
    uid: string,
    displayName: string | null,
    email: string,
  ): AuthProfile {
    return {
      uid,
      name: displayName || email.split('@')[0],
      email,
      phoneNumber: '',
      currentPoints: 0,
      pendingPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      tier: 'Silver',
      joinedDate: new Date().toISOString(),
      vouchers: [],
      role: 'member',
      emailVerified: true,
      profileComplete: false,
    };
  }
}
