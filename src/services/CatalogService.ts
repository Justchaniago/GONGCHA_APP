import { RewardItem } from '../types/types';
import { onVouchersChangeLegacy } from './legacyFirestoreCleanup';

/**
 * @deprecated Legacy direct Firestore CatalogService.
 * Replaced by FastAPI-backed catalog/rewards repositories and presenters.
 */
export const CatalogService = {
  /**
   * @deprecated Direct Firestore fetch is deprecated. Use FastAPI services instead.
   */
  async getCatalog(): Promise<RewardItem[]> {
    console.warn('[DEPRECATED] CatalogService.getCatalog called. Replaced by FastAPI.');
    return [];
  },

  /**
   * @deprecated Direct Firestore fetch is deprecated. Use FastAPI services instead.
   */
  async getAvailableVouchers(): Promise<RewardItem[]> {
    console.warn('[DEPRECATED] CatalogService.getAvailableVouchers called. Replaced by FastAPI.');
    return [];
  },

  /**
   * @deprecated Direct Firestore listener is deprecated. Use legacyFirestoreCleanup directly if needed, or FastAPI-backed services.
   */
  onVouchersChange(callback: (vouchers: RewardItem[]) => void): () => void {
    return onVouchersChangeLegacy(callback);
  },
};