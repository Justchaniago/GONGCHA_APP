import { AuthCommands } from '../application/auth/AuthCommands';
import { GoogleIdentityCommands } from '../application/auth/GoogleIdentityCommands';
import type { AuthenticationGateway } from '../application/ports/auth/AuthenticationGateway';
import type { GoogleIdentityGateway } from '../application/ports/auth/GoogleIdentityGateway';
import { runtimeConfig } from '../config/runtime';
import { ExpoSavedLoginCredentialCapability } from '../infrastructure/auth/ExpoSavedLoginCredentialCapability';

function buildGateways(): {
  authentication: AuthenticationGateway;
  google: GoogleIdentityGateway;
} {
  if (runtimeConfig.mode === 'local_emulator') {
    const { firebaseLocalAuth } = require('../config/firebaseLocal');
    const { FirebaseEmulatorAuthenticationGateway } = require(
      '../infrastructure/auth/FirebaseEmulatorAuthenticationGateway'
    );
    const { UnsupportedLocalGoogleIdentityGateway } = require(
      '../infrastructure/auth/UnsupportedLocalGoogleIdentityGateway'
    );
    return {
      authentication: new FirebaseEmulatorAuthenticationGateway(
        firebaseLocalAuth,
      ),
      google: new UnsupportedLocalGoogleIdentityGateway(),
    };
  }
  const { firebaseAuth, firestoreDb } = require('../config/firebase');
  const { FirebaseAuthenticationGateway } = require(
    '../infrastructure/auth/FirebaseAuthenticationGateway'
  );
  const { FirebaseGoogleIdentityGateway } = require(
    '../infrastructure/auth/FirebaseGoogleIdentityGateway'
  );
  return {
    authentication: new FirebaseAuthenticationGateway(
      firebaseAuth,
      firestoreDb,
    ),
    google: new FirebaseGoogleIdentityGateway(firebaseAuth),
  };
}

const gateways = buildGateways();
export const authCommands = new AuthCommands(gateways.authentication);
export const googleIdentityCommands = new GoogleIdentityCommands(
  gateways.google,
);

export const savedLoginCredentialCapability =
  new ExpoSavedLoginCredentialCapability();
