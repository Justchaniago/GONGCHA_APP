import * as LocalAuthentication from 'expo-local-authentication';

import type { BiometricCapability } from '../../application/ports/security/BiometricCapability';

export class ExpoBiometricCapability implements BiometricCapability {
  async isAvailable() {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  }

  async authenticate() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify to continue',
      cancelLabel: 'Use PIN',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });
    return result.success;
  }
}
