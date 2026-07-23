import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StoreCache } from '../../../application/ports/stores/StoreCache';
import type { Store } from '../../../application/stores/Store';
import { decodeStores, decodeStoreSyncTime } from './storeCacheCodec';

export const LEGACY_STORES_CACHE_KEY = '@gongcha_stores_data';
export const LEGACY_STORES_SYNC_TIME_KEY = '@gongcha_stores_sync_time';

export class AsyncStorageStoreCache implements StoreCache {
  async readStores(): Promise<Store[]> {
    try {
      return decodeStores(await AsyncStorage.getItem(LEGACY_STORES_CACHE_KEY));
    } catch {
      return [];
    }
  }

  async writeStores(stores: Store[]): Promise<void> {
    await AsyncStorage.setItem(LEGACY_STORES_CACHE_KEY, JSON.stringify(stores));
  }

  async readSyncTime(): Promise<number> {
    try {
      return decodeStoreSyncTime(
        await AsyncStorage.getItem(LEGACY_STORES_SYNC_TIME_KEY),
      );
    } catch {
      return 0;
    }
  }

  async writeSyncTime(epochMilliseconds: number): Promise<void> {
    await AsyncStorage.setItem(
      LEGACY_STORES_SYNC_TIME_KEY,
      epochMilliseconds.toString(),
    );
  }
}
