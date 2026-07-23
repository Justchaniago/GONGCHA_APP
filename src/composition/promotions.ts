import { ObservePromotions } from '../application/promotions/ObservePromotions';
import type { PromotionType } from '../application/promotions/Promotion';
import { firestoreDb } from '../config/firebase';
import { FirestorePromotionRepository } from '../infrastructure/promotions/FirestorePromotionRepository';
import { usePromotions as usePromotionsController } from '../presentation/promotions/usePromotions';

const promotionRepository = new FirestorePromotionRepository(firestoreDb);
const observePromotions = new ObservePromotions(promotionRepository);

export function usePromotions(type: PromotionType) {
  return usePromotionsController(observePromotions, type);
}
