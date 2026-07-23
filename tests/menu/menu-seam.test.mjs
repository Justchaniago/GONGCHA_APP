import assert from 'node:assert/strict';
import test from 'node:test';

import { GetMenu, visibleMenuByName } from '../../src/application/menu/GetMenu.ts';
import {
  LegacyFirestoreMenuRepository,
  mergeMenuItems,
} from '../../src/infrastructure/menu/LegacyFirestoreMenuRepository.ts';
import {
  decodeMenuItems,
  decodeSyncTime,
} from '../../src/infrastructure/cache/menu/menuCacheCodec.ts';

const tea = {
  id: 'tea',
  name: 'Brewed Tea',
  category: 'BrewedTea',
  basePrice: 18000,
  isLargeAvailable: true,
};
const coffee = {
  id: 'coffee',
  name: 'Coffee',
  category: 'Coffee',
  basePrice: 20000,
  isLargeAvailable: false,
};

test('visible menu filters soft deletes and sorts without mutating input', () => {
  const unavailable = { ...tea, id: 'hidden', name: 'A', isAvailable: false };
  const input = [coffee, unavailable, tea];

  assert.deepEqual(visibleMenuByName(input), [tea, coffee]);
  assert.deepEqual(input, [coffee, unavailable, tea]);
});

test('delta merge replaces changed ids and retains cached ids', () => {
  const changedTea = { ...tea, basePrice: 19000 };
  assert.deepEqual(mergeMenuItems([tea, coffee], [changedTea]), [changedTea, coffee]);
});

test('cache codec fails closed for malformed and invalid payloads', () => {
  assert.deepEqual(decodeMenuItems('{bad json'), []);
  assert.deepEqual(decodeMenuItems(JSON.stringify([{ id: 'partial' }])), []);
  assert.equal(decodeSyncTime('not-a-number'), 0);
  assert.equal(decodeSyncTime('-1'), 0);
  assert.deepEqual(decodeMenuItems(JSON.stringify([tea])), [tea]);
  assert.equal(decodeSyncTime('123'), 123);
});

function createCache(items = [], syncTime = 0) {
  return {
    items,
    syncTime,
    itemWrites: 0,
    syncWrites: 0,
    async readItems() {
      return this.items;
    },
    async writeItems(nextItems) {
      this.items = nextItems;
      this.itemWrites += 1;
    },
    async readSyncTime() {
      return this.syncTime;
    },
    async writeSyncTime(nextSyncTime) {
      this.syncTime = nextSyncTime;
      this.syncWrites += 1;
    },
  };
}

test('repository uses cache for zero changes and advances sync time', async () => {
  const cache = createCache([tea], 50);
  const source = {
    async loadChanges(since) {
      assert.equal(since, 50);
      return [];
    },
  };

  const result = await new LegacyFirestoreMenuRepository(source, cache, () => 100).load();

  assert.deepEqual(result, { items: [tea], stale: false });
  assert.equal(cache.itemWrites, 0);
  assert.equal(cache.syncTime, 100);
});

test('repository returns cached data when remote load fails', async () => {
  const cache = createCache([tea], 50);
  const source = {
    async loadChanges() {
      throw new Error('offline');
    },
  };

  const result = await new LegacyFirestoreMenuRepository(source, cache).load();

  assert.deepEqual(result, { items: [tea], stale: true });
  assert.equal(cache.syncWrites, 0);
});

test('repository coalesces overlapping refreshes', async () => {
  const cache = createCache([tea], 50);
  let resolveChanges;
  let sourceCalls = 0;
  const changes = new Promise((resolve) => {
    resolveChanges = resolve;
  });
  const source = {
    async loadChanges() {
      sourceCalls += 1;
      return changes;
    },
  };
  const repository = new LegacyFirestoreMenuRepository(source, cache, () => 100);

  const first = repository.load();
  const second = repository.load();
  resolveChanges([coffee]);

  assert.deepEqual(await first, await second);
  assert.equal(sourceCalls, 1);
  assert.deepEqual(cache.items, [tea, coffee]);
});

test('GetMenu exposes sorted visible data from repository snapshot', async () => {
  const repository = {
    async load() {
      return {
        items: [coffee, { ...tea, isAvailable: false }],
        stale: true,
      };
    },
  };

  assert.deepEqual(await new GetMenu(repository).execute(), {
    items: [coffee],
    stale: true,
  });
});
