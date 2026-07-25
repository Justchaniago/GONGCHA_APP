import type { Auth } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';

import type { ProfileRepository } from '../../application/ports/profile/ProfileRepository';
import type {
  ProfileData,
  ProfileUpdates,
} from '../../application/profile/ProfileData';

export class FirestoreProfileRepository implements ProfileRepository {
  constructor(
    private readonly auth: Auth,
    private readonly database: Firestore,
  ) {}

  hasCurrentIdentity() {
    return Boolean(this.auth.currentUser);
  }

  async getCurrent(): Promise<ProfileData | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    try {
      const snapshot = await getDoc(doc(this.database, 'users', user.uid));
      if (snapshot.exists()) return snapshot.data() as ProfileData;
    } catch (error) {
      console.warn('[FirestoreProfileRepository] getCurrent warning:', error);
    }
    return {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Member',
      email: user.email ?? '',
      phoneNumber: user.phoneNumber || user.email?.split('@')[0] || '',
      profileComplete: true,
    } as ProfileData;
  }

  async updateCurrent(updates: ProfileUpdates) {
    const user = this.requireCurrentUser();
    try {
      await updateDoc(doc(this.database, 'users', user.uid), updates);
    } catch (e) {
      console.warn('[FirestoreProfileRepository] updateCurrent warning:', e);
    }
  }

  async completeCurrent(fullName: string, dateOfBirth: string) {
    const user = this.requireCurrentUser();
    try {
      await setDoc(
        doc(this.database, 'users', user.uid),
        {
          name: fullName,
          dateOfBirth,
          profileComplete: true,
        },
        { merge: true },
      );
    } catch (e) {
      console.warn('[FirestoreProfileRepository] completeCurrent warning:', e);
    }
    await user.getIdToken(true).catch(() => '');
  }

  private requireCurrentUser() {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user;
  }
}
