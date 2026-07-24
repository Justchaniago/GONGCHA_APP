import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LoyaltySummaryController } from '../../src/application/loyaltySummary/LoyaltySummaryController.ts';
import {
  FastApiLoyaltySummaryRepository,
  parseLoyaltySummary,
} from '../../src/infrastructure/loyaltySummary/FastApiLoyaltySummaryRepository.ts';

function payload(overrides = {}) {
  return {
    available_leaves: 5,
    qualifying_leaves: 10,
    pending: { state: 'unsupported', leaves: null },
    tier: {
      code: 'LOVER',
      display_name: 'Gong cha Lover',
      current_threshold: 0,
      next_code: 'MASTER',
      next_display_name: 'Gong cha Master',
      next_threshold: 100,
      remaining: 90,
      progress_percent: 10,
    },
    policy_version: 'gongcha-tier-candidate-v1',
    ...overrides,
  };
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

function response(value, overrides = {}) {
  return {
    ok: true,
    status: 200,
    async json() {
      return value;
    },
    ...overrides,
  };
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

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('strict parser maps backend-owned Leaves and candidate tier fields', () => {
  assert.deepEqual(parseLoyaltySummary(payload()), {
    availableLeaves: 5,
    qualifyingLeaves: 10,
    pending: { state: 'unsupported', leaves: null },
    tier: {
      code: 'LOVER',
      displayName: 'Gong cha Lover',
      currentThreshold: 0,
      nextCode: 'MASTER',
      nextDisplayName: 'Gong cha Master',
      nextThreshold: 100,
      remaining: 90,
      progressPercent: 10,
    },
    policyVersion: 'gongcha-tier-candidate-v1',
  });
  assert.equal(
    parseLoyaltySummary(payload({ available_leaves: -5 })).availableLeaves,
    -5,
  );
  assert.equal(
    parseLoyaltySummary(
      payload({
        tier: {
          code: 'LEGEND',
          display_name: 'Gong cha Legend',
          current_threshold: 1600,
          next_code: null,
          next_display_name: null,
          next_threshold: null,
          remaining: 0,
          progress_percent: 100,
        },
      }),
    ).tier.nextCode,
    null,
  );
});

test('strict parser rejects extra, malformed, hidden, and invented values', () => {
  const invalid = [
    { ...payload(), extra: true },
    payload({ available_leaves: 1.5 }),
    payload({ qualifying_leaves: -1 }),
    payload({ pending: { state: 'available', leaves: 0 } }),
    payload({ policy_version: 'legacy' }),
    payload({ tier: { ...payload().tier, code: 'FAMILY' } }),
    payload({ tier: { ...payload().tier, progress_percent: 101 } }),
    payload({
      tier: {
        ...payload().tier,
        next_display_name: null,
      },
    }),
    payload({ tier: { ...payload().tier, unexpected: true } }),
  ];
  for (const value of invalid) {
    assert.throws(
      () => parseLoyaltySummary(value),
      /loyalty_summary_invalid_response/,
    );
  }
});

test('FastAPI adapter sends current auth token to local summary endpoint', async () => {
  const calls = [];
  const repository = new FastApiLoyaltySummaryRepository(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async (url, init) => {
      calls.push([url, init]);
      return response(payload());
    },
  );
  const summary = await repository.load('member-1');
  assert.equal(summary.tier.displayName, 'Gong cha Lover');
  assert.deepEqual(calls, [
    [
      'http://127.0.0.1:8000/api/v1/member/loyalty-summary',
      {
        method: 'GET',
        headers: { Authorization: 'Bearer emulator-token' },
      },
    ],
  ]);
});

test('FastAPI adapter fails closed for host, identity, HTTP, and malformed JSON', async () => {
  assert.throws(
    () =>
      new FastApiLoyaltySummaryRepository(
        { currentUser: fakeUser() },
        'https://api.example.com',
      ),
    /loyalty_summary_backend_not_local/,
  );
  const mismatch = new FastApiLoyaltySummaryRepository(
    { currentUser: fakeUser() },
    'http://10.0.2.2:8000',
  );
  await assert.rejects(
    () => mismatch.load('member-2'),
    /loyalty_summary_identity_mismatch/,
  );
  const expired = new FastApiLoyaltySummaryRepository(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async () => response({}, { ok: false, status: 401 }),
  );
  await assert.rejects(
    () => expired.load('member-1'),
    /loyalty_summary_session_expired/,
  );
  const malformed = new FastApiLoyaltySummaryRepository(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async () => response({}),
  );
  await assert.rejects(
    () => malformed.load('member-1'),
    /loyalty_summary_invalid_response/,
  );
});

test('FastAPI adapter rejects identity changes during token, fetch, and JSON', async () => {
  const tokenPending = deferred();
  const user = fakeUser({
    async getIdToken() {
      return tokenPending.promise;
    },
  });
  const auth = { currentUser: user };
  let fetches = 0;
  const repository = new FastApiLoyaltySummaryRepository(
    auth,
    'http://127.0.0.1:8000',
    async () => {
      fetches += 1;
      return response(payload());
    },
  );
  const tokenRequest = repository.load('member-1');
  auth.currentUser = fakeUser({ uid: 'member-2' });
  tokenPending.resolve('token');
  await assert.rejects(
    tokenRequest,
    /loyalty_summary_identity_changed/,
  );
  assert.equal(fetches, 0);

  const fetchPending = deferred();
  auth.currentUser = user;
  user.getIdToken = async () => 'token';
  const duringFetch = new FastApiLoyaltySummaryRepository(
    auth,
    'http://127.0.0.1:8000',
    async () => fetchPending.promise,
  );
  const fetchRequest = duringFetch.load('member-1');
  await flush();
  auth.currentUser = fakeUser({ uid: 'member-2' });
  fetchPending.resolve(response(payload()));
  await assert.rejects(
    fetchRequest,
    /loyalty_summary_identity_changed/,
  );

  const jsonPending = deferred();
  auth.currentUser = user;
  const duringJson = new FastApiLoyaltySummaryRepository(
    auth,
    'http://127.0.0.1:8000',
    async () => ({
      ok: true,
      async json() {
        return jsonPending.promise;
      },
    }),
  );
  const jsonRequest = duringJson.load('member-1');
  await flush();
  auth.currentUser = fakeUser({ uid: 'member-2' });
  jsonPending.resolve(payload());
  await assert.rejects(
    jsonRequest,
    /loyalty_summary_identity_changed/,
  );
});

test('controller loads, refreshes, preserves stale data on error, and retries', async () => {
  let fail = false;
  let available = 5;
  const controller = new LoyaltySummaryController({
    async load() {
      if (fail) throw new Error('offline');
      return parseLoyaltySummary(payload({ available_leaves: available }));
    },
  });
  controller.start('member-1');
  await flush();
  assert.equal(controller.getState().phase, 'ready');
  assert.equal(controller.getState().summary.availableLeaves, 5);

  fail = true;
  await controller.refresh();
  assert.equal(controller.getState().phase, 'ready');
  assert.equal(controller.getState().summary.availableLeaves, 5);
  assert.equal(controller.getState().error, 'summary_refresh_failed');

  fail = false;
  available = 7;
  await controller.retry();
  assert.equal(controller.getState().summary.availableLeaves, 7);
  assert.equal(controller.getState().error, null);
});

test('controller suppresses stale account-switch and stopped responses', async () => {
  const first = deferred();
  const controller = new LoyaltySummaryController({
    async load(uid) {
      if (uid === 'member-1') return first.promise;
      return parseLoyaltySummary(payload({ available_leaves: 2 }));
    },
  });
  controller.start('member-1');
  controller.start('member-2');
  await flush();
  first.resolve(parseLoyaltySummary(payload({ available_leaves: 99 })));
  await flush();
  assert.equal(controller.getState().summary.availableLeaves, 2);

  const late = deferred();
  const stopped = new LoyaltySummaryController({
    async load() {
      return late.promise;
    },
  });
  stopped.start('member-1');
  stopped.stop();
  late.resolve(parseLoyaltySummary(payload()));
  await flush();
  assert.equal(stopped.getState().phase, 'idle');
});

test('controller keeps the newest overlapping refresh result', async () => {
  const olderRefresh = deferred();
  let calls = 0;
  const controller = new LoyaltySummaryController({
    async load() {
      calls += 1;
      if (calls === 1) {
        return parseLoyaltySummary(payload({ available_leaves: 1 }));
      }
      if (calls === 2) return olderRefresh.promise;
      return parseLoyaltySummary(payload({ available_leaves: 3 }));
    },
  });
  controller.start('member-1');
  await flush();

  const older = controller.refresh();
  const newer = controller.refresh();
  await newer;
  olderRefresh.resolve(
    parseLoyaltySummary(payload({ available_leaves: 2 })),
  );
  await older;

  assert.equal(controller.getState().summary.availableLeaves, 3);
});

test('local summary surface has no provider, legacy tier, or client policy math', () => {
  const files = [
    '../../src/application/loyaltySummary/LoyaltySummary.ts',
    '../../src/application/loyaltySummary/LoyaltySummaryController.ts',
    '../../src/application/ports/loyaltySummary/LoyaltySummaryRepository.ts',
    '../../src/infrastructure/loyaltySummary/FastApiLoyaltySummaryRepository.ts',
    '../../src/presentation/loyaltySummary/useLocalLoyaltySummary.ts',
    '../../src/composition/loyaltySummary.ts',
    '../../src/screens/LocalDashboardScreen.tsx',
    '../../src/screens/LocalMembershipStatusScreen.tsx',
  ];
  const forbidden = [
    'firebase/firestore',
    'firebase/storage',
    'TransactionService',
    'BackendApi',
    'UserService',
    'Silver',
    'Gold',
    'Platinum',
    'tierXp',
    'TIER_LIMITS',
    '1600 -',
    '800 -',
    '100 -',
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
  }
  const dashboard = readFileSync(
    new URL('../../src/screens/LocalDashboardScreen.tsx', import.meta.url),
    'utf8',
  );
  for (const field of [
    'availableLeaves',
    'qualifyingLeaves',
    'displayName',
    'policyVersion',
    'progressPercent',
    'remaining',
    'Pending Leaves belum tersedia',
  ]) {
    assert.equal(dashboard.includes(field), true, `missing ${field}`);
  }
});

test('local membership status reuses authoritative summary without legacy policy', () => {
  const screen = readFileSync(
    new URL(
      '../../src/screens/LocalMembershipStatusScreen.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  const navigator = readFileSync(
    new URL('../../src/navigation/LocalAppNavigator.tsx', import.meta.url),
    'utf8',
  );
  const dashboard = readFileSync(
    new URL('../../src/screens/LocalDashboardScreen.tsx', import.meta.url),
    'utf8',
  );
  const composition = readFileSync(
    new URL('../../src/composition/loyaltySummary.ts', import.meta.url),
    'utf8',
  );

  for (const field of [
    'availableLeaves',
    'qualifyingLeaves',
    'currentThreshold',
    'nextThreshold',
    'remaining',
    'progressPercent',
    'policyVersion',
    'Belum didukung',
    'Benefit belum dikonfigurasi',
  ]) {
    assert.equal(screen.includes(field), true, `missing ${field}`);
  }
  for (const forbidden of [
    "from '../screens/MembershipStatusScreen'",
    'Silver',
    'Gold',
    'Platinum',
    'tierXp',
    'TIER_CONFIG',
    'firebase/firestore',
    'firebase/storage',
    'RewardsScreen',
    'MemberCardModal',
  ]) {
    assert.equal(screen.includes(forbidden), false, `contains ${forbidden}`);
  }
  assert.equal(
    navigator.includes(
      "import LocalMembershipStatusScreen from '../screens/LocalMembershipStatusScreen'",
    ),
    true,
  );
  assert.equal(
    navigator.includes('name="LocalMembershipStatus"'),
    true,
  );
  assert.equal(
    dashboard.includes("navigation.navigate('LocalMembershipStatus')"),
    true,
  );
  assert.equal(
    screen.includes("navigation.navigate('LocalLoyaltyActivity')"),
    true,
  );
  assert.equal(
    composition.includes('createLocalLoyaltySummaryController'),
    true,
  );
  assert.equal(
    composition.includes(
      'return new LoyaltySummaryController(localLoyaltySummaryRepository)',
    ),
    true,
  );
  assert.equal(
    screen.includes(
      '() => createLocalLoyaltySummaryController()',
    ),
    true,
  );
});
