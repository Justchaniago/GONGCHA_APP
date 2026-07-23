import { onIdTokenChanged, type Auth } from 'firebase/auth';

import type { SessionGateway } from '../../application/ports/session/SessionGateway';

export class FirebaseSessionGateway implements SessionGateway {
  constructor(private readonly auth: Auth) {}

  observe(
    onIdentity: Parameters<SessionGateway['observe']>[0],
    onError: Parameters<SessionGateway['observe']>[1],
  ): () => void {
    return onIdTokenChanged(
      this.auth,
      (user) => {
        onIdentity(
          user
            ? {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                providerIds: user.providerData.map(
                  (provider) => provider.providerId,
                ),
              }
            : null,
        );
      },
      () => onError(),
    );
  }
}
