import { GOOGLE_AUTH_STATUS } from '../application/auth/AuthProfile';
import { googleIdentityCommands } from '../composition/auth';

export const statusCodes = GOOGLE_AUTH_STATUS;

export function configureGoogleSignIn() {
  googleIdentityCommands.configure();
}

export function signInWithGoogle() {
  return googleIdentityCommands.signIn();
}

export function linkGoogleToAccount() {
  return googleIdentityCommands.linkCurrentAccount();
}

export function signOutGoogle() {
  return googleIdentityCommands.signOut();
}
