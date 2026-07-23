import type { Store } from '../../stores/Store';

export type StoreLoadMode = 'full' | 'delta';

export interface StoreRepositorySnapshot {
  stores: Store[];
  stale: boolean;
}

export interface StoreRepository {
  load(mode: StoreLoadMode): Promise<StoreRepositorySnapshot>;
}
