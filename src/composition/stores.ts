import { GetStores } from '../application/stores/GetStores';
import { firestoreDb } from '../config/firebase';
import { AsyncStorageStoreCache } from '../infrastructure/cache/stores/AsyncStorageStoreCache';
import { ExpoLocationCapability } from '../infrastructure/location/ExpoLocationCapability';
import { SystemClock } from '../infrastructure/location/SystemClock';
import { FirestoreStoreSource } from '../infrastructure/stores/FirestoreStoreSource';
import { LegacyFirestoreStoreRepository } from '../infrastructure/stores/LegacyFirestoreStoreRepository';
import { useStoresController } from '../presentation/stores/useStoresController';

const storeCache = new AsyncStorageStoreCache();
const storeSource = new FirestoreStoreSource(firestoreDb);
const storeRepository = new LegacyFirestoreStoreRepository(
  storeSource,
  storeCache,
);
const locationCapability = new ExpoLocationCapability();
const getStores = new GetStores(storeRepository, locationCapability);
const clock = new SystemClock();

export function useStores(enabled: boolean) {
  return useStoresController(getStores, clock, enabled);
}
