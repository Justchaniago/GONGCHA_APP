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
    const snapshot = await getDoc(doc(this.database, 'users', user.uid));
    return snapshot.exists() ? (snapshot.data() as ProfileData) : null;
  }

  async updateCurrent(updates: ProfileUpdates) {
    const user = this.requireCurrentUser();
    await updateDoc(doc(this.database, 'users', user.uid), updates);
  }

  async completeCurrent(fullName: string, dateOfBirth: string) {
    const user = this.requireCurrentUser();
    await setDoc(
      doc(this.database, 'users', user.uid),
      {
        name: fullName,
        dateOfBirth,
        profileComplete: true,
      },
      { merge: true },
    );
    await user.getIdToken(true);
  }

  private requireCurrentUser() {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user;
  }
}
