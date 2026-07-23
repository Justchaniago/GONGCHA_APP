import type { AuthenticationGateway } from '../ports/auth/AuthenticationGateway';

export class AuthCommands {
  private readonly gateway: AuthenticationGateway;

  constructor(gateway: AuthenticationGateway) {
    this.gateway = gateway;
  }

  loginWithPhoneAlias(email: string, password: string) {
    return this.gateway.loginWithPhoneAlias(email, password);
  }

  registerWithPhoneAlias(
    email: string,
    password: string,
    name: string,
    phone: string,
  ) {
    return this.gateway.registerWithPhoneAlias(email, password, name, phone);
  }

  registerWithEmail(
    email: string,
    password: string,
    name: string,
    phone?: string,
  ) {
    return this.gateway.registerWithEmail(email, password, name, phone);
  }

  loginWithEmail(email: string, password: string) {
    return this.gateway.loginWithEmail(email, password);
  }

  resendVerificationEmail(email: string, password: string) {
    return this.gateway.resendVerificationEmail(email, password);
  }

  sendPasswordReset(email: string) {
    return this.gateway.sendPasswordReset(email);
  }

  confirmPasswordReset(oobCode: string, newPassword: string) {
    return this.gateway.confirmPasswordReset(oobCode, newPassword);
  }

  applyEmailVerificationCode(oobCode: string) {
    return this.gateway.applyEmailVerificationCode(oobCode);
  }

  autoLoginAfterEmailVerification(email: string, password: string) {
    return this.gateway.autoLoginAfterEmailVerification(email, password);
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.gateway.changePassword(currentPassword, newPassword);
  }

  logout() {
    return this.gateway.logout();
  }

  currentSubject() {
    return this.gateway.currentSubject();
  }

  currentIdentity() {
    return this.gateway.currentIdentity();
  }
}
