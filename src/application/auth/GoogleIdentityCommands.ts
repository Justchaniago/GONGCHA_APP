import type { GoogleIdentityGateway } from '../ports/auth/GoogleIdentityGateway';

export class GoogleIdentityCommands {
  private readonly gateway: GoogleIdentityGateway;

  constructor(gateway: GoogleIdentityGateway) {
    this.gateway = gateway;
  }

  configure() {
    this.gateway.configure();
  }

  signIn() {
    return this.gateway.signIn();
  }

  linkCurrentAccount() {
    return this.gateway.linkCurrentAccount();
  }

  signOut() {
    return this.gateway.signOut();
  }
}
