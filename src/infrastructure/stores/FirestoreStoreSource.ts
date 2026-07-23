import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
  type Query,
} from 'firebase/firestore';

import type { StoreSource } from '../../application/ports/stores/StoreSource';
import type { StoreLoadMode } from '../../application/ports/stores/StoreRepository';
import type { Store } from '../../application/stores/Store';
import { mapLegacyStoreDocument } from './legacyStoreMapper';

export class FirestoreStoreSource implements StoreSource {
  constructor(private readonly database: Firestore) {}

  async load(
    mode: StoreLoadMode,
    sinceEpochMilliseconds: number,
  ): Promise<Store[]> {
    const stores = collection(this.database, 'stores');
    const storeQuery: Query =
      mode === 'full'
        ? query(stores)
        : query(
            stores,
            where('updatedAt', '>', new Date(sinceEpochMilliseconds)),
          );
    const snapshot = await getDocs(storeQuery);

    return snapshot.docs.map((document) =>
      mapLegacyStoreDocument(document.id, document.data()),
    );
  }
}
