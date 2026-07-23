import type {
  AuthProfile,
  CurrentAuthIdentity,
} from '../../auth/AuthProfile';

export interface AuthenticationGateway {
  loginWithPhoneAlias(email: string, password: string): Promise<AuthProfile>;
  registerWithPhoneAlias(
    email: string,
    password: string,
    name: string,
    phone: string,
  ): Promise<AuthProfile>;
  registerWithEmail(
    email: string,
    password: string,
    name: string,
    phone?: string,
  ): Promise<AuthProfile>;
  loginWithEmail(email: string, password: string): Promise<AuthProfile>;
  resendVerificationEmail(email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  confirmPasswordReset(oobCode: string, newPassword: string): Promise<void>;
  applyEmailVerificationCode(oobCode: string): Promise<void>;
  autoLoginAfterEmailVerification(
    email: string,
    password: string,
  ): Promise<AuthProfile>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  logout(): Promise<void>;
  currentSubject(): string | null;
  currentIdentity(): CurrentAuthIdentity | null;
}
