import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { LoadLocalActivityFixture } from '../../src/application/loyaltyActivity/LoadLocalActivityFixture.ts';
import { FastApiLocalActivityFixtureGateway } from '../../src/infrastructure/loyaltyActivity/FastApiLocalActivityFixtureGateway.ts';

function fakeUser(overrides = {}) {
  return {
    uid: 'member-1',
    async getIdToken() {
      return 'emulator-token';
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

test('gateway sends authenticated empty POST without member or economic payload', async () => {
  const calls = [];
  const gateway = new FastApiLocalActivityFixtureGateway(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async (url, init) => {
      calls.push([url, init]);
      return {
        ok: true,
        status: 200,
        async json() {
          return { status: 'created', activity_count: 4 };
        },
      };
    },
  );

  await gateway.createForMember('member-1');
  assert.deepEqual(calls, [
    [
      'http://127.0.0.1:8000/__local__/fixtures/member-activity',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer emulator-token' },
      },
    ],
  ]);
  assert.equal('body' in calls[0][1], false);
});

test('gateway fails closed outside local backend and across identity/errors', async () => {
  assert.throws(
    () =>
      new FastApiLocalActivityFixtureGateway(
        { currentUser: fakeUser() },
        'https://api.example.com',
      ),
    /local_activity_fixture_backend_not_local/,
  );

  const mismatch = new FastApiLocalActivityFixtureGateway(
    { currentUser: fakeUser() },
    'http://10.0.2.2:8000',
    async () => {
      throw new Error('must not fetch');
    },
  );
  await assert.rejects(
    () => mismatch.createForMember('other-member'),
    /local_activity_fixture_identity_mismatch/,
  );

  const expired = new FastApiLocalActivityFixtureGateway(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async () => ({
      ok: false,
      status: 401,
      async json() {},
    }),
  );
  await assert.rejects(
    () => expired.createForMember('member-1'),
    /local_activity_fixture_session_expired/,
  );

  const unavailable = new FastApiLocalActivityFixtureGateway(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    async () => {
      throw new Error('network details');
    },
  );
  await assert.rejects(
    () => unavailable.createForMember('member-1'),
    /local_activity_fixture_unavailable/,
  );
});

test('gateway accepts exact statuses and rejects malformed successful JSON', async () => {
  for (const status of ['created', 'replayed', 'converged']) {
    const gateway = new FastApiLocalActivityFixtureGateway(
      { currentUser: fakeUser() },
      'http://127.0.0.1:8000',
      async () => ({
        ok: true,
        status: 200,
        async json() {
          return { status, activity_count: 4 };
        },
      }),
    );
    await gateway.createForMember('member-1');
  }

  for (const payload of [
    { status: 'complete', activity_count: 4 },
    { status: 'created', activity_count: 3 },
    { status: 'created', activity_count: 4, member_id: 'member-1' },
    ['created', 4],
  ]) {
    const gateway = new FastApiLocalActivityFixtureGateway(
      { currentUser: fakeUser() },
      'http://127.0.0.1:8000',
      async () => ({
        ok: true,
        status: 200,
        async json() {
          return payload;
        },
      }),
    );
    await assert.rejects(
      () => gateway.createForMember('member-1'),
      /local_activity_fixture_invalid_response/,
    );
  }
});

test('use case coalesces commands and refreshes only after backend success', async () => {
  const pending = deferred();
  const calls = [];
  const useCase = new LoadLocalActivityFixture(
    {
      async createForMember(uid) {
        calls.push(['create', uid]);
        await pending.promise;
      },
    },
    async () => {
      calls.push(['refresh']);
    },
    () => true,
  );

  const first = useCase.execute('member-1');
  const second = useCase.execute('member-1');
  assert.equal(first, second);
  assert.deepEqual(calls, [['create', 'member-1']]);
  pending.resolve();
  await first;
  assert.deepEqual(calls, [['create', 'member-1'], ['refresh']]);
});

test('use case rejects a different identity while a command is in flight', async () => {
  const pending = deferred();
  const calls = [];
  const useCase = new LoadLocalActivityFixture(
    {
      async createForMember(uid) {
        calls.push(uid);
        await pending.promise;
      },
    },
    async () => {},
    () => true,
  );

  const first = useCase.execute('member-1');
  await assert.rejects(
    () => useCase.execute('member-2'),
    /local_activity_fixture_identity_changed/,
  );
  assert.deepEqual(calls, ['member-1']);
  pending.resolve();
  await first;

  await useCase.execute('member-2');
  assert.deepEqual(calls, ['member-1', 'member-2']);
});

test('failed command can retry and never refreshes failed fixture', async () => {
  let attempts = 0;
  let refreshes = 0;
  const useCase = new LoadLocalActivityFixture(
    {
      async createForMember() {
        attempts += 1;
        if (attempts === 1) throw new Error('failed');
      },
    },
    async () => {
      refreshes += 1;
    },
    () => true,
  );

  await assert.rejects(() => useCase.execute('member-1'), /failed/);
  assert.equal(refreshes, 0);
  await useCase.execute('member-1');
  assert.equal(attempts, 2);
  assert.equal(refreshes, 1);
});

test('use case rejects identity switch before refresh and after refresh', async () => {
  let currentUid = 'member-1';
  let refreshes = 0;
  const gatewayPending = deferred();
  const beforeRefresh = new LoadLocalActivityFixture(
    {
      async createForMember() {
        await gatewayPending.promise;
      },
    },
    async () => {
      refreshes += 1;
    },
    (uid) => currentUid === uid,
  );
  const first = beforeRefresh.execute('member-1');
  currentUid = 'member-2';
  gatewayPending.resolve();
  await assert.rejects(first, /local_activity_fixture_identity_changed/);
  assert.equal(refreshes, 0);

  currentUid = 'member-1';
  const refreshPending = deferred();
  const afterRefresh = new LoadLocalActivityFixture(
    {
      async createForMember() {},
    },
    async () => {
      refreshes += 1;
      await refreshPending.promise;
    },
    (uid) => currentUid === uid,
  );
  const second = afterRefresh.execute('member-1');
  await new Promise((resolve) => setImmediate(resolve));
  currentUid = 'member-2';
  refreshPending.resolve();
  await assert.rejects(second, /local_activity_fixture_identity_changed/);
  assert.equal(refreshes, 1);
});

test('gateway rejects auth identity changes during token or fetch', async () => {
  const tokenPending = deferred();
  const firstUser = fakeUser({
    async getIdToken() {
      return tokenPending.promise;
    },
  });
  const auth = { currentUser: firstUser };
  let fetches = 0;
  const duringToken = new FastApiLocalActivityFixtureGateway(
    auth,
    'http://127.0.0.1:8000',
    async () => {
      fetches += 1;
      return {
        ok: true,
        async json() {
          return { status: 'created', activity_count: 4 };
        },
      };
    },
  );
  const tokenRequest = duringToken.createForMember('member-1');
  auth.currentUser = fakeUser({ uid: 'member-2' });
  tokenPending.resolve('emulator-token');
  await assert.rejects(
    tokenRequest,
    /local_activity_fixture_identity_changed/,
  );
  assert.equal(fetches, 0);

  const fetchPending = deferred();
  auth.currentUser = firstUser;
  firstUser.getIdToken = async () => 'emulator-token';
  const duringFetch = new FastApiLocalActivityFixtureGateway(
    auth,
    'http://127.0.0.1:8000',
    async () => fetchPending.promise,
  );
  const fetchRequest = duringFetch.createForMember('member-1');
  await new Promise((resolve) => setImmediate(resolve));
  auth.currentUser = fakeUser({ uid: 'member-2' });
  fetchPending.resolve({
    ok: true,
    async json() {
      return { status: 'created', activity_count: 4 };
    },
  });
  await assert.rejects(
    fetchRequest,
    /local_activity_fixture_identity_changed/,
  );
});

test('fixture surface has explicit retry and no legacy or direct data access', () => {
  const files = [
    '../../src/application/loyaltyActivity/LoadLocalActivityFixture.ts',
    '../../src/application/ports/loyaltyActivity/LocalActivityFixtureGateway.ts',
    '../../src/infrastructure/loyaltyActivity/FastApiLocalActivityFixtureGateway.ts',
    '../../src/composition/loyaltyActivity.ts',
    '../../src/screens/LocalLoyaltyActivityScreen.tsx',
  ];
  const forbidden = [
    'firebase/firestore',
    'firebase/storage',
    'TransactionService',
    'BackendApi',
    'UserService',
    'pointsDelta +',
    'currentPoints',
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
  const screen = readFileSync(
    new URL('../../src/screens/LocalLoyaltyActivityScreen.tsx', import.meta.url),
    'utf8',
  );
  assert.equal(screen.includes('Muat Demo Activity'), true);
  assert.equal(screen.includes('Coba Lagi Muat Demo Activity'), true);
  assert.equal(screen.includes('fixtureUidRef.current === initiatingUid'), true);
  assert.equal(
    screen.includes(
      'fixtureGenerationRef.current === initiatingGeneration',
    ),
    true,
  );
  assert.equal(screen.includes("setFixturePhase('idle')"), true);
});
