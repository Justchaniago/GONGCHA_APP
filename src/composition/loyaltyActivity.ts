import { LoyaltyActivityController } from '../application/loyaltyActivity/LoyaltyActivityController';
import { LoadLocalActivityFixture } from '../application/loyaltyActivity/LoadLocalActivityFixture';
import { firebaseLocalAuth } from '../config/firebaseLocal';
import { runtimeConfig } from '../config/runtime';
import { FastApiLocalActivityFixtureGateway } from '../infrastructure/loyaltyActivity/FastApiLocalActivityFixtureGateway';
import { FastApiLoyaltyActivityRepository } from '../infrastructure/loyaltyActivity/FastApiLoyaltyActivityRepository';
import { USE_FASTAPI_BACKEND, FASTAPI_BASE_URL } from '../config/flags';

const localBackendBaseUrl =
  runtimeConfig.mode === 'local_emulator'
    ? runtimeConfig.backendBaseUrl
    : FASTAPI_BASE_URL;

export function createLocalLoyaltyActivityController(): LoyaltyActivityController {
  const auth = USE_FASTAPI_BACKEND
    ? (require('../config/firebase') as typeof import('../config/firebase')).firebaseAuth
    : firebaseLocalAuth;
  const baseUrl = USE_FASTAPI_BACKEND ? FASTAPI_BASE_URL : localBackendBaseUrl;

  return new LoyaltyActivityController(
    new FastApiLoyaltyActivityRepository(
      auth,
      baseUrl,
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
