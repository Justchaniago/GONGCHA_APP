import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import type {
  SavedLoginCredentialCapability,
  SavedLoginCredentials,
} from '../../application/ports/auth/SavedLoginCredentialCapability';

const KEY_EMAIL = '@gongcha_bio_email';
const KEY_PASSWORD = '@gongcha_bio_password';

export class ExpoSavedLoginCredentialCapability
  implements SavedLoginCredentialCapability
{
  async isAvailable() {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  }

  async hasSavedCredentials() {
    return Boolean(await SecureStore.getItemAsync(KEY_EMAIL));
  }

  async saveCredentials(email: string, password: string) {
    await Promise.all([
      SecureStore.setItemAsync(KEY_EMAIL, email),
      SecureStore.setItemAsync(KEY_PASSWORD, password),
    ]);
  }

  async getCredentials(): Promise<SavedLoginCredentials | null> {
    const [email, password] = await Promise.all([
      SecureStore.getItemAsync(KEY_EMAIL),
      SecureStore.getItemAsync(KEY_PASSWORD),
    ]);
    return email && password ? { email, password } : null;
  }

  async clearCredentials() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_EMAIL).catch(() => {}),
      SecureStore.deleteItemAsync(KEY_PASSWORD).catch(() => {}),
    ]);
  }

  async authenticate(promptMessage = 'Masuk ke Gong Cha') {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Gunakan Password',
      disableDeviceFallback: false,
    });
    return result.success;
  }
}
