import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as GoogleSignInModule from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
  type Auth,
} from 'firebase/auth';

import type { GoogleIdentityGateway } from '../../application/ports/auth/GoogleIdentityGateway';

const WEB_CLIENT_ID =
  '353793177534-5enfb8b2dqqr2nud59umnmsv806it0pk.apps.googleusercontent.com';
const IOS_CLIENT_ID =
  '353793177534-pi67g3k2jf9dc8de07lll35aa4j5qhh2.apps.googleusercontent.com';

export class FirebaseGoogleIdentityGateway implements GoogleIdentityGateway {
  private readonly isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  constructor(private readonly auth: Auth) {}

  configure() {
    if (this.isExpoGo) return;
    this.module().GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      iosClientId: IOS_CLIENT_ID,
      offlineAccess: false,
    });
  }

  async signIn() {
    const idToken = await this.getIdToken(
      'Google sign-in gagal: tidak ada ID token.',
    );
    await signInWithCredential(
      this.auth,
      GoogleAuthProvider.credential(idToken),
    );
  }

  async linkCurrentAccount() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) throw new Error('Tidak ada user yang login.');
    const idToken = await this.getIdToken('Gagal mendapatkan token Google.');
    await linkWithCredential(
      currentUser,
      GoogleAuthProvider.credential(idToken),
    );
  }

  async signOut() {
    if (this.isExpoGo) return;
    try {
      await this.module().GoogleSignin.signOut();
    } catch {
      // Firebase session remains authoritative for app logout.
    }
  }

  private module(): typeof GoogleSignInModule {
    if (this.isExpoGo) {
      throw new Error(
        'Google Sign-In tidak tersedia di Expo Go. Gunakan login email atau development build.',
      );
    }
    return require('@react-native-google-signin/google-signin') as typeof GoogleSignInModule;
  }

  private async getIdToken(missingTokenMessage: string): Promise<string> {
    const { GoogleSignin } = this.module();
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
    await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();
    if (!idToken) {
      throw new Error(missingTokenMessage);
    }
    return idToken;
  }
}
