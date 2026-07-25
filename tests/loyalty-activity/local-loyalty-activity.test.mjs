import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LoyaltyActivityController } from '../../src/application/loyaltyActivity/LoyaltyActivityController.ts';
import {
  FastApiLoyaltyActivityRepository,
  parseLoyaltyActivityPage,
  parsePendingAvailability,
} from '../../src/infrastructure/loyaltyActivity/FastApiLoyaltyActivityRepository.ts';

const activityId = (value) => `la_${value.repeat(64)}`;
const cursor = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function activity(overrides = {}) {
  return {
    activity_id: activityId('a'),
    event_type: 'earn',
    points_delta: 25,
    status: 'posted',
    activity_at: '2026-07-24T10:00:00+00:00',
    external_order_reference: 'order-1',
    total_minor: 25000,
    currency: 'IDR',
    ...overrides,
  };
}

function page(items = [], nextCursor = null) {
  return { items, next_cursor: nextCursor };
}

function fakeUser(overrides = {}) {
  return {
    uid: 'member-1',
    async getIdToken() {
      return 'emulator-token';
    },
    ...overrides,
  };
}

function jsonResponse(value, overrides = {}) {
  return {
    ok: true,
    status: 200,
    async json() {
      return value;
    },
    ...overrides,
  };
}

test('strict parser maps all event types and preserves signed deltas', () => {
  const parsed = parseLoyaltyActivityPage(
    page([
      activity(),
      activity({
        activity_id: activityId('b'),
        event_type: 'refund_reversal',
        points_delta: -25,
      }),
      activity({
        activity_id: activityId('c'),
        event_type: 'redemption',
        points_delta: -10,
        external_order_reference: null,
        total_minor: null,
        currency: null,
      }),
    ], cursor),
  );

  assert.deepEqual(
    parsed.items.map(({ eventType, pointsDelta }) => ({
      eventType,
      pointsDelta,
    })),
    [
      { eventType: 'earn', pointsDelta: 25 },
      { eventType: 'refund_reversal', pointsDelta: -25 },
      { eventType: 'redemption', pointsDelta: -10 },
    ],
  );
  assert.equal(parsed.nextCursor, cursor);
});

test('strict parser rejects unknown, zero, partial, malformed, and extra data', () => {
  const invalidItems = [
    activity({ event_type: 'adjustment' }),
    activity({ points_delta: 0 }),
    activity({ points_delta: 1.5 }),
    activity({ activity_at: 'July 24' }),
    activity({ external_order_reference: null }),
    activity({ currency: 'idr' }),
    activity({ unexpected: true }),
  ];
  for (const item of invalidItems) {
    assert.throws(
      () => parseLoyaltyActivityPage(page([item])),
      /loyalty_activity_invalid_response/,
    );
  }
  assert.throws(
    () => parseLoyaltyActivityPage({ items: [], next_cursor: null, count: 0 }),
    /loyalty_activity_invalid_response/,
  );
  assert.throws(
    () => parseLoyaltyActivityPage(page([], 'cursor with spaces')),
    /loyalty_activity_invalid_response/,
  );
});

test('pending parser accepts only explicit unsupported null contract', () => {
  assert.equal(
    parsePendingAvailability({
      state: 'unsupported',
      pending_count: null,
      pending_points: null,
    }),
    'unsupported',
  );
  for (const value of [
    { state: 'unsupported', pending_count: 0, pending_points: 0 },
    { state: 'available', pending_count: 0, pending_points: 0 },
    {
      state: 'unsupported',
      pending_count: null,
      pending_points: null,
      extra: true,
    },
  ]) {
    assert.throws(
      () => parsePendingAvailability(value),
      /loyalty_activity_invalid_pending_response/,
    );
  }
});

test('FastAPI adapter sends only token, limit, and opaque cursor', async () => {
  const calls = [];
  const repository = new FastApiLoyaltyActivityRepository(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async (url, init) => {
      calls.push([url, init]);
      return jsonResponse(page([activity()], null));
    },
  );

  const result = await repository.loadPage('member-1', cursor, 5);

  assert.equal(result.items[0].pointsDelta, 25);
  assert.deepEqual(calls, [
    [
      `http://127.0.0.1:8000/api/v1/member/loyalty-activity?limit=5&cursor=${cursor}`,
      {
        method: 'GET',
        headers: { Authorization: 'Bearer emulator-token' },
      },
    ],
  ]);
  assert.equal(calls[0][0].includes('member-1'), false);
});

test('FastAPI adapter reads unsupported pending without numeric fallback', async () => {
  const repository = new FastApiLoyaltyActivityRepository(
    { currentUser: fakeUser() },
    'http://10.0.2.2:8000',
    async (url) => {
      assert.equal(
        url,
        'http://10.0.2.2:8000/api/v1/member/pending-summary',
      );
      return jsonResponse({
        state: 'unsupported',
        pending_count: null,
        pending_points: null,
      });
    },
  );
  assert.equal(await repository.loadPending('member-1'), 'unsupported');
});

test('FastAPI adapter fails closed for host, identity, HTTP, and network errors', async () => {
  assert.throws(
    () =>
      new FastApiLoyaltyActivityRepository(
        { currentUser: fakeUser() },
        'ftp://invalid.com',
      ),
    /loyalty_activity_backend_not_local/,
  );

  const mismatch = new FastApiLoyaltyActivityRepository(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async () => {
      throw new Error('must not fetch');
    },
  );
  await assert.rejects(
    () => mismatch.loadPage('other-member'),
    /loyalty_activity_identity_mismatch/,
  );

  const expired = new FastApiLoyaltyActivityRepository(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async () => jsonResponse({}, { ok: false, status: 401 }),
  );
  await assert.rejects(
    () => expired.loadPage('member-1'),
    /loyalty_activity_session_expired/,
  );

  const unavailable = new FastApiLoyaltyActivityRepository(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async () => {
      throw new Error('network details');
    },
  );
  await assert.rejects(
    () => unavailable.loadPage('member-1'),
    /loyalty_activity_unavailable/,
  );
});

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function controllerItem(id, delta = 10) {
  return {
    activityId: activityId(id),
    eventType: delta > 0 ? 'earn' : 'redemption',
    pointsDelta: delta,
    status: 'posted',
    activityAt: '2026-07-24T10:00:00+00:00',
    externalOrderReference: delta > 0 ? 'order' : null,
  };
}

test('controller distinguishes honest empty success and unsupported pending', async () => {
  const controller = new LoyaltyActivityController({
    async loadPage() {
      return { items: [], nextCursor: null };
    },
    async loadPending() {
      return 'unsupported';
    },
  });
  const states = [];
  controller.observe((state) => states.push(state));
  controller.start('member-1');
  await flush();

  assert.equal(states.some((state) => state.phase === 'loading'), true);
  assert.deepEqual(controller.getState(), {
    phase: 'ready',
    items: [],
    nextCursor: null,
    pendingAvailability: 'unsupported',
    refreshing: false,
    loadingMore: false,
    pageError: null,
  });
});

test('controller coalesces load-more and preserves backend order', async () => {
  const next = deferred();
  let pageCalls = 0;
  const controller = new LoyaltyActivityController({
    async loadPage(_uid, requestedCursor) {
      pageCalls += 1;
      if (!requestedCursor) {
        return { items: [controllerItem('a')], nextCursor: cursor };
      }
      return next.promise;
    },
    async loadPending() {
      return 'unsupported';
    },
  });
  controller.start('member-1');
  await flush();

  const first = controller.loadMore();
  const second = controller.loadMore();
  assert.equal(first, second);
  assert.equal(pageCalls, 2);
  next.resolve({
    items: [controllerItem('b', -5)],
    nextCursor: null,
  });
  await first;

  assert.deepEqual(
    controller.getState().items.map((item) => item.activityId),
    [activityId('a'), activityId('b')],
  );
  assert.equal(controller.getState().loadingMore, false);
});

test('controller rejects duplicate page and repeated cursor without losing data', async () => {
  const firstItem = controllerItem('a');
  const responses = [
    { items: [firstItem], nextCursor: cursor },
    { items: [firstItem], nextCursor: cursor },
  ];
  const controller = new LoyaltyActivityController({
    async loadPage() {
      return responses.shift();
    },
    async loadPending() {
      return 'unsupported';
    },
  });
  controller.start('member-1');
  await flush();
  await controller.loadMore();

  assert.deepEqual(controller.getState().items, [firstItem]);
  assert.equal(
    controller.getState().pageError,
    'activity_pagination_failed',
  );
});

test('refresh failure retains prior items and remains distinct from empty', async () => {
  let fail = false;
  const firstItem = controllerItem('a');
  const controller = new LoyaltyActivityController({
    async loadPage() {
      if (fail) throw new Error('offline');
      return { items: [firstItem], nextCursor: null };
    },
    async loadPending() {
      if (fail) throw new Error('offline');
      return 'unsupported';
    },
  });
  controller.start('member-1');
  await flush();
  fail = true;
  await controller.refresh();

  assert.deepEqual(controller.getState().items, [firstItem]);
  assert.equal(controller.getState().phase, 'ready');
  assert.equal(controller.getState().pageError, 'activity_load_failed');
  assert.equal(controller.getState().pendingAvailability, 'error');
});

test('identity switch and stop suppress stale responses', async () => {
  const first = deferred();
  const controller = new LoyaltyActivityController({
    async loadPage(uid) {
      if (uid === 'member-1') return first.promise;
      return { items: [controllerItem('b')], nextCursor: null };
    },
    async loadPending() {
      return 'unsupported';
    },
  });
  controller.start('member-1');
  controller.start('member-2');
  await flush();
  first.resolve({ items: [controllerItem('a')], nextCursor: null });
  await flush();
  assert.deepEqual(controller.getState().items, [controllerItem('b')]);

  const late = deferred();
  const stopped = new LoyaltyActivityController({
    async loadPage() {
      return late.promise;
    },
    async loadPending() {
      return 'unsupported';
    },
  });
  stopped.start('member-1');
  stopped.stop();
  late.resolve({ items: [controllerItem('c')], nextCursor: null });
  await flush();
  assert.equal(stopped.getState().phase, 'idle');
  assert.deepEqual(stopped.getState().items, []);
});

test('local activity surface contains no legacy business-data imports', () => {
  const files = [
    '../../src/application/loyaltyActivity/LoyaltyActivity.ts',
    '../../src/application/loyaltyActivity/LoyaltyActivityController.ts',
    '../../src/application/ports/loyaltyActivity/LoyaltyActivityRepository.ts',
    '../../src/infrastructure/loyaltyActivity/FastApiLoyaltyActivityRepository.ts',
    '../../src/presentation/loyaltyActivity/useLocalLoyaltyActivity.ts',
    '../../src/composition/loyaltyActivity.ts',
    '../../src/screens/LocalLoyaltyActivityScreen.tsx',
    '../../src/screens/LocalDashboardScreen.tsx',
    '../../src/navigation/LocalAppNavigator.tsx',
  ];
  const forbidden = [
    'firebase/firestore',
    'firebase/storage',
    'TransactionService',
    'BackendApi',
    'UserService',
    '/api/members/me/transactions',
  ];
  for (const relativePath of files) {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    for (const dependency of forbidden) {
      assert.equal(
        source.includes(dependency),
        false,
        `${relativePath} contains ${dependency}`,
      );
    }
    assert.equal(
      /from ['"][^'"]*config\/firebase['"]/.test(source),
      false,
      `${relativePath} imports legacy Firebase config`,
    );
  }
});

test('local navigator exposes isolated local activity without legacy Profile', () => {
  const navigator = readFileSync(
    new URL('../../src/navigation/LocalAppNavigator.tsx', import.meta.url),
    'utf8',
  );
  const dashboard = readFileSync(
    new URL('../../src/screens/LocalDashboardScreen.tsx', import.meta.url),
    'utf8',
  );
  assert.equal(navigator.includes('LocalLoyaltyActivityScreen'), true);
  assert.equal(
    /from ['"][^'"]*screens\/ProfileScreen['"]/.test(navigator),
    false,
  );
  assert.equal(navigator.includes('MainApp'), false);
  assert.equal(
    dashboard.includes("navigation.navigate('LocalLoyaltyActivity')"),
    true,
  );
});
