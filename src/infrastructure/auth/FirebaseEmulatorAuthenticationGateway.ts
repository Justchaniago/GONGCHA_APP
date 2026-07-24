import {
  EmailAuthProvider,
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';

import type { AuthProfile } from '../../application/auth/AuthProfile';
import type { AuthenticationGateway } from '../../application/ports/auth/AuthenticationGateway';

export interface EmulatorAuthOperations {
  create(auth: Auth, email: string, password: string): Promise<{ user: User }>;
  signIn(auth: Auth, email: string, password: string): Promise<{ user: User }>;
  signOut(auth: Auth): Promise<void>;
  updateProfile(user: User, profile: { displayName: string }): Promise<void>;
  sendVerification(user: User): Promise<void>;
}

const defaultOperations: EmulatorAuthOperations = {
  create: createUserWithEmailAndPassword,
  signIn: signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendVerification: sendEmailVerification,
};

function compatibilityProfile(
  user: User,
  overrides: Partial<AuthProfile> = {},
): AuthProfile {
  return {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Member',
    email: user.email ?? '',
    phoneNumber: user.phoneNumber ?? '',
    currentPoints: 0,
    pendingPoints: 0,
    lifetimePoints: 0,
    tierXp: 0,
    tier: 'Silver',
    joinedDate: '',
    vouchers: [],
    role: 'member',
    emailVerified: user.emailVerified,
    profileComplete: false,
    ...overrides,
  };
}

export class FirebaseEmulatorAuthenticationGateway
  implements AuthenticationGateway
{
  private readonly auth: Auth;
  private readonly operations: EmulatorAuthOperations;

  constructor(
    auth: Auth,
    operations: EmulatorAuthOperations = defaultOperations,
  ) {
    this.auth = auth;
    this.operations = operations;
  }

  async loginWithPhoneAlias(email: string, password: string) {
    const { user } = await this.operations.signIn(
      this.auth,
      email,
      password,
    );
    return compatibilityProfile(user);
  }

  async registerWithPhoneAlias(
    email: string,
    password: string,
    name: string,
    phone: string,
  ) {
    const { user } = await this.operations.create(
      this.auth,
      email,
      password,
    );
    await this.operations.updateProfile(user, { displayName: name });
    return compatibilityProfile(user, { name, phoneNumber: phone });
  }

  async registerWithEmail(
    email: string,
    password: string,
    name: string,
    phone?: string,
  ) {
    const { user } = await this.operations.create(
      this.auth,
      email,
      password,
    );
    await this.operations.updateProfile(user, { displayName: name });
    await this.operations.sendVerification(user);
    await this.operations.signOut(this.auth);
    return compatibilityProfile(user, {
      name,
      phoneNumber: phone ?? '',
      emailVerified: false,
    });
  }

  async loginWithEmail(email: string, password: string) {
    const { user } = await this.operations.signIn(
      this.auth,
      email,
      password,
    );
    await user.reload();
    if (!user.emailVerified) {
      await this.operations.signOut(this.auth);
      throw new Error('email_not_verified');
    }
    return compatibilityProfile(user, { emailVerified: true });
  }

  async resendVerificationEmail(email: string, password: string) {
    const { user } = await this.operations.signIn(
      this.auth,
      email,
      password,
    );
    await this.operations.sendVerification(user);
    await this.operations.signOut(this.auth);
  }

  sendPasswordReset(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  confirmPasswordReset(oobCode: string, newPassword: string) {
    return confirmPasswordReset(this.auth, oobCode, newPassword);
  }

  async applyEmailVerificationCode(oobCode: string) {
    await applyActionCode(this.auth, oobCode);
    await this.auth.currentUser?.reload();
  }

  async autoLoginAfterEmailVerification(
    email: string,
    password: string,
  ) {
    return this.loginWithEmail(email, password);
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
    await updatePassword(user, newPassword);
  }

  logout() {
    return this.operations.signOut(this.auth);
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
          providerIds: user.providerData.map(
            (provider) => provider.providerId,
          ),
        }
      : null;
  }
}
