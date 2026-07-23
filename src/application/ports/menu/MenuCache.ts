import type { MenuItem } from '../../menu/MenuItem';

export interface MenuCache {
  readItems(): Promise<MenuItem[]>;
  writeItems(items: MenuItem[]): Promise<void>;
  readSyncTime(): Promise<number>;
  writeSyncTime(epochMilliseconds: number): Promise<void>;
}
