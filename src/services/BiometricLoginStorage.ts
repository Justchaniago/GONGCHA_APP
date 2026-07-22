import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY_EMAIL = '@gongcha_bio_email';
const KEY_PASSWORD = '@gongcha_bio_password';

export const BiometricLoginStorage = {
  async isAvailable(): Promise<boolean> {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  },

  async hasSavedCredentials(): Promise<boolean> {
    const email = await SecureStore.getItemAsync(KEY_EMAIL);
    return !!email;
  },

  async saveCredentials(email: string, password: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEY_EMAIL, email),
      SecureStore.setItemAsync(KEY_PASSWORD, password),
    ]);
  },

  async getCredentials(): Promise<{ email: string; password: string } | null> {
    const [email, password] = await Promise.all([
      SecureStore.getItemAsync(KEY_EMAIL),
      SecureStore.getItemAsync(KEY_PASSWORD),
    ]);
    if (!email || !password) return null;
    return { email, password };
  },

  async clearCredentials(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_EMAIL).catch(() => {}),
      SecureStore.deleteItemAsync(KEY_PASSWORD).catch(() => {}),
    ]);
  },

  async authenticate(promptMessage = 'Masuk ke Gong Cha'): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Gunakan Password',
      disableDeviceFallback: false,
    });
    return result.success;
  },
};
