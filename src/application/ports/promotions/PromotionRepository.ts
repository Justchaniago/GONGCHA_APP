import type { Promotion } from '../../promotions/Promotion';

export type PromotionUnsubscribe = () => void;

export interface PromotionRepository {
  observe(
    onUpdate: (promotions: Promotion[]) => void,
    onError: () => void,
  ): PromotionUnsubscribe;
}
