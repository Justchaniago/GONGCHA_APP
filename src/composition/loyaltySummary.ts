import { LoyaltySummaryController } from '../application/loyaltySummary/LoyaltySummaryController';
import { firebaseAuth } from '../config/firebase';
import { firebaseLocalAuth } from '../config/firebaseLocal';
import { runtimeConfig } from '../config/runtime';
import { FastApiLoyaltySummaryRepository } from '../infrastructure/loyaltySummary/FastApiLoyaltySummaryRepository';
import { USE_FASTAPI_BACKEND, FASTAPI_BASE_URL } from '../config/flags';

const backendBaseUrl =
  runtimeConfig.mode === 'local_emulator'
    ? runtimeConfig.backendBaseUrl
    : FASTAPI_BASE_URL;

const auth = USE_FASTAPI_BACKEND ? firebaseAuth : firebaseLocalAuth;
const baseUrl = USE_FASTAPI_BACKEND ? FASTAPI_BASE_URL : backendBaseUrl;

const localLoyaltySummaryRepository = new FastApiLoyaltySummaryRepository(
  auth,
  baseUrl,
);

export function createLocalLoyaltySummaryController(): LoyaltySummaryController {
  return new LoyaltySummaryController(localLoyaltySummaryRepository);
}

export const localLoyaltySummaryController =
  createLocalLoyaltySummaryController();
