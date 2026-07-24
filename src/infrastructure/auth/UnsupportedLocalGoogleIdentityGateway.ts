import type { GoogleIdentityGateway } from '../../application/ports/auth/GoogleIdentityGateway';

export class UnsupportedLocalGoogleIdentityGateway
  implements GoogleIdentityGateway
{
  configure() {}

  async signIn(): Promise<void> {
    throw new Error('local_google_sign_in_unavailable');
  }

  async linkCurrentAccount(): Promise<void> {
    throw new Error('local_google_sign_in_unavailable');
  }

  async signOut(): Promise<void> {}
}
