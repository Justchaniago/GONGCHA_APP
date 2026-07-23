import type { Store } from '../../stores/Store';

export interface StoreCache {
  readStores(): Promise<Store[]>;
  writeStores(stores: Store[]): Promise<void>;
  readSyncTime(): Promise<number>;
  writeSyncTime(epochMilliseconds: number): Promise<void>;
}
