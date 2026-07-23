import type { MenuItem } from '../../application/menu/MenuItem';
import type { MenuCache } from '../../application/ports/menu/MenuCache';
import type {
  MenuRepository,
  MenuRepositorySnapshot,
} from '../../application/ports/menu/MenuRepository';
import type { MenuSource } from '../../application/ports/menu/MenuSource';

export function mergeMenuItems(
  cachedItems: readonly MenuItem[],
  changedItems: readonly MenuItem[],
): MenuItem[] {
  const itemsById = new Map(cachedItems.map((item) => [item.id, item]));
  changedItems.forEach((item) => itemsById.set(item.id, item));
  return Array.from(itemsById.values());
}

export class LegacyFirestoreMenuRepository implements MenuRepository {
  private inFlight: Promise<MenuRepositorySnapshot> | null = null;
  private readonly source: MenuSource;
  private readonly cache: MenuCache;
  private readonly now: () => number;

  constructor(
    source: MenuSource,
    cache: MenuCache,
    now: () => number = Date.now,
  ) {
    this.source = source;
    this.cache = cache;
    this.now = now;
  }

  load(): Promise<MenuRepositorySnapshot> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.loadOnce().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async loadOnce(): Promise<MenuRepositorySnapshot> {
    const cachedItems = await this.cache.readItems();
    const lastSyncTime = await this.cache.readSyncTime();
    const currentSyncTime = this.now();

    try {
      const changedItems = await this.source.loadChanges(lastSyncTime);
      const items = mergeMenuItems(cachedItems, changedItems);

      if (changedItems.length > 0) {
        await this.cache.writeItems(items);
      }
      await this.cache.writeSyncTime(currentSyncTime);

      return { items, stale: false };
    } catch {
      return { items: cachedItems, stale: true };
    }
  }
}
