import { firestoreDb } from '../config/firebase';
import { ExpoBiometricCapability } from '../infrastructure/security/ExpoBiometricCapability';
import { LegacySecurityRepository } from '../infrastructure/security/LegacySecurityRepository';

export const securityRepository = new LegacySecurityRepository(firestoreDb);
export const biometricCapability = new ExpoBiometricCapability();
