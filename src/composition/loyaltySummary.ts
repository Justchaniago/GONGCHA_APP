import { LoyaltySummaryController } from '../application/loyaltySummary/LoyaltySummaryController';
import { firebaseLocalAuth } from '../config/firebaseLocal';
import { runtimeConfig } from '../config/runtime';
import { FastApiLoyaltySummaryRepository } from '../infrastructure/loyaltySummary/FastApiLoyaltySummaryRepository';

if (runtimeConfig.mode !== 'local_emulator') {
  throw new Error('local_loyalty_summary_requires_emulator');
}

const localLoyaltySummaryRepository = new FastApiLoyaltySummaryRepository(
  firebaseLocalAuth,
  runtimeConfig.backendBaseUrl,
);

export function createLocalLoyaltySummaryController(): LoyaltySummaryController {
  return new LoyaltySummaryController(localLoyaltySummaryRepository);
}

export const localLoyaltySummaryController =
  createLocalLoyaltySummaryController();
