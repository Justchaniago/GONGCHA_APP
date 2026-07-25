import { LoyaltyActivityController } from '../application/loyaltyActivity/LoyaltyActivityController';
import { LoadLocalActivityFixture } from '../application/loyaltyActivity/LoadLocalActivityFixture';
import { firebaseLocalAuth } from '../config/firebaseLocal';
import { runtimeConfig } from '../config/runtime';
import { FastApiLocalActivityFixtureGateway } from '../infrastructure/loyaltyActivity/FastApiLocalActivityFixtureGateway';
import { FastApiLoyaltyActivityRepository } from '../infrastructure/loyaltyActivity/FastApiLoyaltyActivityRepository';

const localBackendBaseUrl =
  runtimeConfig.mode === 'local_emulator'
    ? runtimeConfig.backendBaseUrl
    : 'https://gongcha-backend-79343384792.asia-southeast1.run.app';

export function createLocalLoyaltyActivityController(): LoyaltyActivityController {
  return new LoyaltyActivityController(
    new FastApiLoyaltyActivityRepository(
      firebaseLocalAuth,
      localBackendBaseUrl,
    ),
  );
}

export const localLoyaltyActivityController =
  createLocalLoyaltyActivityController();

export const loadLocalActivityFixture = new LoadLocalActivityFixture(
  new FastApiLocalActivityFixtureGateway(
    firebaseLocalAuth,
    localBackendBaseUrl,
  ),
  async () => {
    await localLoyaltyActivityController.refresh();
    const state = localLoyaltyActivityController.getState();
    if (
      state.phase === 'error' ||
      state.pageError === 'activity_load_failed'
    ) {
      throw new Error('local_activity_fixture_refresh_failed');
    }
  },
  (uid) => firebaseLocalAuth.currentUser?.uid === uid,
);
