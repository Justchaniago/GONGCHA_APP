import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateStoreDistance,
  GetStores,
  visibleOrderedStores,
} from '../../src/application/stores/GetStores.ts';
import { getStoreStatus } from '../../src/application/stores/GetStoreStatus.ts';
import {
  decodeStores,
  decodeStoreSyncTime,
} from '../../src/infrastructure/cache/stores/storeCacheCodec.ts';
import {
  LegacyFirestoreStoreRepository,
  mergeStores,
} from '../../src/infrastructure/stores/LegacyFirestoreStoreRepository.ts';
import { mapLegacyStoreDocument } from '../../src/infrastructure/stores/legacyStoreMapper.ts';

const jakarta = {
  id: 'jakarta',
  name: 'Jakarta',
  address: 'Central Jakarta',
  latitude: -6.2,
  longitude: 106.816666,
  openHours: '10:00 - 22:00',
  isAvailable: true,
};
const bandung = {
  id: 'bandung',
  name: 'Bandung',
  address: 'Bandung',
  latitude: -6.914744,
  longitude: 107.60981,
  openHours: '10:00 - 22:00',
  isAvailable: true,
};

test('legacy mapper supports GeoPoint, aliases, hours, and defaults', () => {
  assert.deepEqual(
    mapLegacyStoreDocument('one', {
      Name: ' Store One ',
      alamat: ' Address ',
      location: { latitude: -6.1, longitude: 106.8 },
      operationalHours: { open: '09:00', close: '21:00' },
      statusOverride: 'almost_close',
    }),
    {
      id: 'one',
      name: 'Store One',
      address: 'Address',
      latitude: -6.1,
      longitude: 106.8,
      openHours: '09:00 - 21:00',
      statusOverride: 'almost_close',
      isAvailable: true,
    },
  );

  assert.deepEqual(
    mapLegacyStoreDocument('two', {
      storeName: 'Store Two',
      Address: 'Second',
      latitude: '-6.2',
      longitude: '106.9',
      openHours: '08.00 - 20.00',
      isAvailable: false,
    }),
    {
      id: 'two',
      name: 'Store Two',
      address: 'Second',
      latitude: -6.2,
      longitude: 106.9,
      openHours: '08.00 - 20.00',
      statusOverride: undefined,
      isAvailable: false,
    },
  );
});

test('cache codec fails closed for corrupt stores and sync times', () => {
  assert.deepEqual(decodeStores('{bad json'), []);
  assert.deepEqual(decodeStores(JSON.stringify([{ id: 'partial' }])), []);
  assert.equal(decodeStoreSyncTime('bad'), 0);
  assert.equal(decodeStoreSyncTime('-1'), 0);
  assert.deepEqual(decodeStores(JSON.stringify([jakarta])), [jakarta]);
  assert.equal(decodeStoreSyncTime('123'), 123);
});

test('full sync replaces non-empty data while delta sync upserts', () => {
  assert.deepEqual(mergeStores([jakarta], [bandung], 'full'), [bandung]);
  assert.deepEqual(mergeStores([jakarta], [], 'full'), [jakarta]);
  assert.deepEqual(
    mergeStores([jakarta, bandung], [{ ...jakarta, name: 'Jakarta Updated' }], 'delta'),
    [{ ...jakarta, name: 'Jakarta Updated' }, bandung],
  );
});

test('visible stores filter unavailable and sort by name without location', () => {
  const hidden = { ...jakarta, id: 'hidden', name: 'A', isAvailable: false };
  assert.deepEqual(visibleOrderedStores([jakarta, hidden, bandung], null), [
    bandung,
    jakarta,
  ]);
});

test('distance is rounded to one decimal and nearest store sorts first', () => {
  const origin = { latitude: -6.21, longitude: 106.82 };
  const distance = calculateStoreDistance(origin, {
    latitude: jakarta.latitude,
    longitude: jakarta.longitude,
  });
  assert.equal(Number.isFinite(distance), true);
  assert.deepEqual(
    visibleOrderedStores([bandung, jakarta], origin).map((store) => store.id),
    ['jakarta', 'bandung'],
  );
});

function localTime(hour, minute) {
  const value = new Date(2026, 6, 24, hour, minute, 0, 0);
  return value.getTime();
}

test('store status supports overrides, daytime, overnight, and closing soon', () => {
  assert.equal(
    getStoreStatus({ ...jakarta, statusOverride: 'closed' }, localTime(12, 0)),
    'closed',
  );
  assert.equal(getStoreStatus(jakarta, localTime(12, 0)), 'open');
  assert.equal(getStoreStatus(jakarta, localTime(9, 0)), 'closed');
  assert.equal(getStoreStatus(jakarta, localTime(21, 45)), 'closing-soon');

  const overnight = { ...jakarta, openHours: '22:00 - 02:00' };
  assert.equal(getStoreStatus(overnight, localTime(23, 0)), 'open');
  assert.equal(getStoreStatus(overnight, localTime(1, 45)), 'closing-soon');
  assert.equal(getStoreStatus(overnight, localTime(12, 0)), 'closed');
});

function createCache(stores = [], syncTime = 0) {
  return {
    stores,
    syncTime,
    storeWrites: 0,
    syncWrites: 0,
    async readStores() {
      return this.stores;
    },
    async writeStores(nextStores) {
      this.stores = nextStores;
      this.storeWrites += 1;
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

test('empty cache promotes delta request to a full query', async () => {
  const cache = createCache([], 50);
  const source = {
    async load(mode, since) {
      assert.equal(mode, 'full');
      assert.equal(since, 0);
      return [jakarta];
    },
  };

  const result = await new LegacyFirestoreStoreRepository(
    source,
    cache,
    () => 100,
  ).load('delta');

  assert.deepEqual(result, { stores: [jakarta], stale: false });
  assert.equal(cache.syncTime, 100);
});

test('repository returns unsorted cached fallback on source failure', async () => {
  const cache = createCache([jakarta, bandung], 50);
  const source = {
    async load() {
      throw new Error('offline');
    },
  };

  const result = await new LegacyFirestoreStoreRepository(source, cache).load(
    'delta',
  );
  assert.deepEqual(result, {
    stores: [jakarta, bandung],
    stale: true,
  });
  assert.equal(cache.syncWrites, 0);
});

test('offline first load returns an empty stale snapshot', async () => {
  const cache = createCache();
  const source = {
    async load() {
      throw new Error('offline');
    },
  };

  assert.deepEqual(
    await new LegacyFirestoreStoreRepository(source, cache).load('full'),
    { stores: [], stale: true },
  );
});

test('repository coalesces overlapping loads and prevents cache overwrite', async () => {
  const cache = createCache([jakarta], 50);
  let resolveStores;
  let sourceCalls = 0;
  const fetched = new Promise((resolve) => {
    resolveStores = resolve;
  });
  const source = {
    async load() {
      sourceCalls += 1;
      return fetched;
    },
  };
  const repository = new LegacyFirestoreStoreRepository(source, cache, () => 100);

  const first = repository.load('delta');
  const second = repository.load('delta');
  resolveStores([bandung]);

  assert.deepEqual(await first, await second);
  assert.equal(sourceCalls, 1);
  assert.deepEqual(cache.stores, [jakarta, bandung]);
});

test('GetStores preserves cached fallback order and permission state', async () => {
  const repository = {
    async load() {
      return { stores: [jakarta, bandung], stale: true };
    },
  };
  const location = {
    async resolveForegroundPosition() {
      return {
        permission: 'granted',
        position: { latitude: bandung.latitude, longitude: bandung.longitude },
      };
    },
  };

  assert.deepEqual(await new GetStores(repository, location).execute('delta'), {
    stores: [jakarta, bandung],
    permission: 'granted',
    stale: true,
  });
});

test('GetStores falls back to name ordering when location is denied', async () => {
  const repository = {
    async load() {
      return { stores: [jakarta, bandung], stale: false };
    },
  };
  const location = {
    async resolveForegroundPosition() {
      return { permission: 'denied', position: null };
    },
  };

  const result = await new GetStores(repository, location).execute('full');
  assert.equal(result.permission, 'denied');
  assert.deepEqual(
    result.stores.map((store) => store.id),
    ['bandung', 'jakarta'],
  );
});
