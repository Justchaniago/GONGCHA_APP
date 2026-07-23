import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Firestore,
} from 'firebase/firestore';

import type { PromotionRepository } from '../../application/ports/promotions/PromotionRepository';
import { mapFirestorePromotion } from './mapFirestorePromotion';

export class FirestorePromotionRepository implements PromotionRepository {
  constructor(private readonly database: Firestore) {}

  observe(
    onUpdate: Parameters<PromotionRepository['observe']>[0],
    onError: Parameters<PromotionRepository['observe']>[1],
  ): () => void {
    const promotionsQuery = query(
      collection(this.database, 'promotions'),
      orderBy('order', 'asc'),
    );

    return onSnapshot(
      promotionsQuery,
      (snapshot) => {
        onUpdate(
          snapshot.docs.map((document) =>
            mapFirestorePromotion(document.id, document.data()),
          ),
        );
      },
      (error) => {
        console.warn(
          '[Promotions] Firestore snapshot error:',
          error.code,
          error.message,
        );
        onError();
      },
    );
  }
}
