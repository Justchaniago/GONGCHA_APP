import type { StoreCache } from '../../application/ports/stores/StoreCache';
import type {
  StoreLoadMode,
  StoreRepository,
  StoreRepositorySnapshot,
} from '../../application/ports/stores/StoreRepository';
import type { StoreSource } from '../../application/ports/stores/StoreSource';
import type { Store } from '../../application/stores/Store';

export function mergeStores(
  cachedStores: readonly Store[],
  fetchedStores: readonly Store[],
  mode: StoreLoadMode,
): Store[] {
  if (mode === 'full' && fetchedStores.length > 0) {
    return [...fetchedStores];
  }

  const storesById = new Map(cachedStores.map((store) => [store.id, store]));
  fetchedStores.forEach((store) => storesById.set(store.id, store));
  return Array.from(storesById.values());
}

export class LegacyFirestoreStoreRepository implements StoreRepository {
  private inFlight: Promise<StoreRepositorySnapshot> | null = null;
  private readonly source: StoreSource;
  private readonly cache: StoreCache;
  private readonly now: () => number;

  constructor(
    source: StoreSource,
    cache: StoreCache,
    now: () => number = Date.now,
  ) {
    this.source = source;
    this.cache = cache;
    this.now = now;
  }

  load(mode: StoreLoadMode): Promise<StoreRepositorySnapshot> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.loadOnce(mode).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async loadOnce(mode: StoreLoadMode): Promise<StoreRepositorySnapshot> {
    const cachedStores = await this.cache.readStores();
    const lastSyncTime = await this.cache.readSyncTime();
    const currentSyncTime = this.now();

    try {
      const effectiveMode =
        mode === 'full' || cachedStores.length === 0 ? 'full' : 'delta';
      const fetchedStores = await this.source.load(
        effectiveMode,
        effectiveMode === 'full' ? 0 : lastSyncTime,
      );
      const stores = mergeStores(cachedStores, fetchedStores, effectiveMode);

      if (fetchedStores.length > 0) {
        await this.cache.writeStores(stores);
      }
      await this.cache.writeSyncTime(currentSyncTime);

      return { stores, stale: false };
    } catch {
      return { stores: cachedStores, stale: true };
    }
  }
}
