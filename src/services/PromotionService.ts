import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';

export type PromotionType = 'carousel' | 'modal_ad';

export interface PromotionItem {
  id: string;
  type: PromotionType;
  title: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  startDate?: any;
  endDate?: any;
}

function mapDoc(doc: any): PromotionItem {
  const d = doc.data();
  return {
    id: doc.id,
    type: d.type ?? 'carousel',
    title: d.title ?? '',
    imageUrl: d.imageUrl ?? '',
    order: typeof d.order === 'number' ? d.order : 0,
    isActive: d.isActive === true,
    startDate: d.startDate ?? null,
    endDate: d.endDate ?? null,
  };
}

function isCurrentlyActive(promo: PromotionItem): boolean {
  if (!promo.isActive) return false;
  const now = Date.now();
  if (promo.startDate?.toMillis && now < promo.startDate.toMillis()) return false;
  if (promo.endDate?.toMillis && now > promo.endDate.toMillis()) return false;
  return true;
}

export const PromotionService = {
  async getActiveByType(type: PromotionType): Promise<PromotionItem[]> {
    // Single orderBy avoids composite index requirement; filter client-side
    const q = query(
      collection(firestoreDb, 'promotions'),
      orderBy('order', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(mapDoc)
      .filter((p) => p.type === type && isCurrentlyActive(p));
  },

  subscribeByType(
    type: PromotionType,
    onUpdate: (items: PromotionItem[]) => void,
  ): () => void {
    const q = query(
      collection(firestoreDb, 'promotions'),
      orderBy('order', 'asc'),
    );
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map(mapDoc)
          .filter((p) => p.type === type && isCurrentlyActive(p));
        onUpdate(items);
      },
      (error) => {
        console.warn('[PromotionService] snapshot error:', error.code, error.message);
        onUpdate([]);
      },
    );
  },
};
