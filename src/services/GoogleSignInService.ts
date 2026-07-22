import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as GoogleSignInModule from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, linkWithCredential } from 'firebase/auth';
import { firebaseAuth } from '../config/firebase';

const WEB_CLIENT_ID = '808600152798-oihvta3egsful3bmnq12a1iriehks0ih.apps.googleusercontent.com';
const IOS_CLIENT_ID = '808600152798-92q0798lo4f49plfniu99bor57108uqd.apps.googleusercontent.com';
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Keep these values available to presentation code without evaluating the
// native Google Sign-In package inside Expo Go.
export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
} as const;

function getGoogleSignInModule(): typeof GoogleSignInModule {
  if (IS_EXPO_GO) {
    throw new Error(
      'Google Sign-In tidak tersedia di Expo Go. Gunakan login email atau development build.',
    );
  }

  return require('@react-native-google-signin/google-signin') as typeof GoogleSignInModule;
}

export function configureGoogleSignIn() {
  if (IS_EXPO_GO) return;

  const { GoogleSignin } = getGoogleSignInModule();
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    offlineAccess: false,
  });
}

export async function signInWithGoogle(): Promise<void> {
  const { GoogleSignin } = getGoogleSignInModule();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signIn();
  const { idToken } = await GoogleSignin.getTokens();
  if (!idToken) throw new Error('Google sign-in gagal: tidak ada ID token.');
  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(firebaseAuth, credential);
}

export async function linkGoogleToAccount(): Promise<void> {
  const { GoogleSignin } = getGoogleSignInModule();
  const currentUser = firebaseAuth.currentUser;
  if (!currentUser) throw new Error('Tidak ada user yang login.');
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signIn();
  const { idToken } = await GoogleSignin.getTokens();
  if (!idToken) throw new Error('Gagal mendapatkan token Google.');
  const credential = GoogleAuthProvider.credential(idToken);
  await linkWithCredential(currentUser, credential);
}

export async function signOutGoogle(): Promise<void> {
  if (IS_EXPO_GO) return;

  try {
    const { GoogleSignin } = getGoogleSignInModule();
    await GoogleSignin.signOut();
  } catch {
    // ignore — firebase session tetap di-handle oleh AuthService
  }
}
