import { GetMenu } from '../application/menu/GetMenu';
import { firestoreDb } from '../config/firebase';
import { AsyncStorageMenuCache } from '../infrastructure/cache/menu/AsyncStorageMenuCache';
import { FirestoreMenuSource } from '../infrastructure/menu/FirestoreMenuSource';
import { LegacyFirestoreMenuRepository } from '../infrastructure/menu/LegacyFirestoreMenuRepository';
import { useMenuController } from '../presentation/menu/useMenuController';

const cache = new AsyncStorageMenuCache();
const source = new FirestoreMenuSource(firestoreDb);
const repository = new LegacyFirestoreMenuRepository(source, cache);
const getMenu = new GetMenu(repository);

export function useMenu() {
  return useMenuController(getMenu);
}
