import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';

import type { MenuItem } from '../../application/menu/MenuItem';
import type { MenuSource } from '../../application/ports/menu/MenuSource';

export class FirestoreMenuSource implements MenuSource {
  constructor(private readonly database: Firestore) {}

  async loadChanges(sinceEpochMilliseconds: number): Promise<MenuItem[]> {
    const changedProducts = query(
      collection(this.database, 'products'),
      where('updatedAt', '>', new Date(sinceEpochMilliseconds)),
    );
    const snapshot = await getDocs(changedProducts);

    return snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        name: data.name,
        category: data.category,
        basePrice: data.basePrice,
        isLargeAvailable: data.isLargeAvailable,
        isHotAvailable: data.isHotAvailable,
        description: data.description,
        imageUrl: data.imageUrl,
        rating: data.rating,
        isAvailable: data.isAvailable,
      } satisfies MenuItem;
    });
  }
}
