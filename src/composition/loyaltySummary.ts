import { LoyaltySummaryController } from '../application/loyaltySummary/LoyaltySummaryController';
import { firebaseLocalAuth } from '../config/firebaseLocal';
import { runtimeConfig } from '../config/runtime';
import { FastApiLoyaltySummaryRepository } from '../infrastructure/loyaltySummary/FastApiLoyaltySummaryRepository';

const backendBaseUrl =
  runtimeConfig.mode === 'local_emulator'
    ? runtimeConfig.backendBaseUrl
    : 'https://gongcha-backend-79343384792.asia-southeast1.run.app';

const localLoyaltySummaryRepository = new FastApiLoyaltySummaryRepository(
  firebaseLocalAuth,
  backendBaseUrl,
);

export function createLocalLoyaltySummaryController(): LoyaltySummaryController {
  return new LoyaltySummaryController(localLoyaltySummaryRepository);
}

export const localLoyaltySummaryController =
  createLocalLoyaltySummaryController();
