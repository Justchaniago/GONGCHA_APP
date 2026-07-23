import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MenuItem } from '../../../application/menu/MenuItem';
import type { MenuCache } from '../../../application/ports/menu/MenuCache';
import { decodeMenuItems, decodeSyncTime } from './menuCacheCodec';

export const LEGACY_MENU_CACHE_KEY = '@gongcha_menu_data';
export const LEGACY_MENU_SYNC_TIME_KEY = '@gongcha_menu_sync_time';

export class AsyncStorageMenuCache implements MenuCache {
  async readItems(): Promise<MenuItem[]> {
    try {
      return decodeMenuItems(await AsyncStorage.getItem(LEGACY_MENU_CACHE_KEY));
    } catch {
      return [];
    }
  }

  async writeItems(items: MenuItem[]): Promise<void> {
    await AsyncStorage.setItem(LEGACY_MENU_CACHE_KEY, JSON.stringify(items));
  }

  async readSyncTime(): Promise<number> {
    try {
      return decodeSyncTime(await AsyncStorage.getItem(LEGACY_MENU_SYNC_TIME_KEY));
    } catch {
      return 0;
    }
  }

  async writeSyncTime(epochMilliseconds: number): Promise<void> {
    await AsyncStorage.setItem(
      LEGACY_MENU_SYNC_TIME_KEY,
      epochMilliseconds.toString(),
    );
  }
}
