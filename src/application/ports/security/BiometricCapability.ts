export interface BiometricCapability {
  isAvailable(): Promise<boolean>;
  authenticate(): Promise<boolean>;
}
