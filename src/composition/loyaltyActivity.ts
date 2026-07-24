import { LoyaltyActivityController } from '../application/loyaltyActivity/LoyaltyActivityController';
import { firebaseLocalAuth } from '../config/firebaseLocal';
import { runtimeConfig } from '../config/runtime';
import { FastApiLoyaltyActivityRepository } from '../infrastructure/loyaltyActivity/FastApiLoyaltyActivityRepository';

if (runtimeConfig.mode !== 'local_emulator') {
  throw new Error('local_loyalty_activity_requires_emulator');
}

export const localLoyaltyActivityController = new LoyaltyActivityController(
  new FastApiLoyaltyActivityRepository(
    firebaseLocalAuth,
    runtimeConfig.backendBaseUrl,
  ),
);
