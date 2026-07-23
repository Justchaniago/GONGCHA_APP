import type { UserProfile } from '../types/types';
import { authCommands } from '../composition/auth';

export const AuthService = {
  login(email: string, password: string): Promise<UserProfile> {
    return authCommands.loginWithPhoneAlias(
      email,
      password,
    ) as Promise<UserProfile>;
  },

  register(
    email: string,
    password: string,
    name: string,
    phone: string,
  ): Promise<UserProfile> {
    return authCommands.registerWithPhoneAlias(
      email,
      password,
      name,
      phone,
    ) as Promise<UserProfile>;
  },

  registerWithEmail(
    email: string,
    password: string,
    name: string,
    phone?: string,
  ): Promise<UserProfile> {
    return authCommands.registerWithEmail(
      email,
      password,
      name,
      phone,
    ) as Promise<UserProfile>;
  },

  loginWithEmail(email: string, password: string): Promise<UserProfile> {
    return authCommands.loginWithEmail(email, password) as Promise<UserProfile>;
  },

  resendVerificationEmail(email: string, password: string) {
    return authCommands.resendVerificationEmail(email, password);
  },

  sendPasswordReset(email: string) {
    return authCommands.sendPasswordReset(email);
  },

  confirmPasswordReset(oobCode: string, newPassword: string) {
    return authCommands.confirmPasswordReset(oobCode, newPassword);
  },

  applyEmailVerificationCode(oobCode: string) {
    return authCommands.applyEmailVerificationCode(oobCode);
  },

  autoLoginAfterEmailVerification(
    email: string,
    password: string,
  ): Promise<UserProfile> {
    return authCommands.autoLoginAfterEmailVerification(
      email,
      password,
    ) as Promise<UserProfile>;
  },

  changePassword(currentPassword: string, newPassword: string) {
    return authCommands.changePassword(currentPassword, newPassword);
  },

  logout() {
    return authCommands.logout();
  },

  getCurrentIdentity() {
    return authCommands.currentIdentity();
  },
};
