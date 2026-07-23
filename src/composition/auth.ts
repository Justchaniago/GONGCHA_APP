import { AuthCommands } from '../application/auth/AuthCommands';
import { GoogleIdentityCommands } from '../application/auth/GoogleIdentityCommands';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { FirebaseAuthenticationGateway } from '../infrastructure/auth/FirebaseAuthenticationGateway';
import { FirebaseGoogleIdentityGateway } from '../infrastructure/auth/FirebaseGoogleIdentityGateway';
import { ExpoSavedLoginCredentialCapability } from '../infrastructure/auth/ExpoSavedLoginCredentialCapability';

export const authCommands = new AuthCommands(
  new FirebaseAuthenticationGateway(firebaseAuth, firestoreDb),
);

export const googleIdentityCommands = new GoogleIdentityCommands(
  new FirebaseGoogleIdentityGateway(firebaseAuth),
);

export const savedLoginCredentialCapability =
  new ExpoSavedLoginCredentialCapability();
