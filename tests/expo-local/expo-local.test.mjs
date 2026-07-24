import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { resolveRuntimeConfig } from '../../src/config/runtime.ts';
import { FirebaseEmulatorAuthenticationGateway } from '../../src/infrastructure/auth/FirebaseEmulatorAuthenticationGateway.ts';
import { UnsupportedLocalGoogleIdentityGateway } from '../../src/infrastructure/auth/UnsupportedLocalGoogleIdentityGateway.ts';
import { FastApiMemberRepository } from '../../src/infrastructure/member/FastApiMemberRepository.ts';
import { NoPendingMemberRepository } from '../../src/infrastructure/member/NoPendingMemberRepository.ts';
import { UnavailableLocalProfileRepository } from '../../src/infrastructure/profile/UnavailableLocalProfileRepository.ts';

test('runtime config is explicit, simulator-only, and fail-closed', () => {
  assert.deepEqual(resolveRuntimeConfig(undefined, undefined, true), {
    mode: 'legacy',
  });
  assert.throws(
    () => resolveRuntimeConfig(undefined, '127.0.0.1', true),
    /local_emulator_host_requires_runtime_mode/,
  );
  assert.deepEqual(
    resolveRuntimeConfig('local_emulator', '127.0.0.1', true),
    {
      mode: 'local_emulator',
      host: '127.0.0.1',
      authEmulatorUrl: 'http://127.0.0.1:9099',
      backendBaseUrl: 'http://127.0.0.1:8000',
      projectId: 'demo-gongcha-local',
    },
  );
  assert.equal(
    resolveRuntimeConfig('local_emulator', '10.0.2.2', true).mode,
    'local_emulator',
  );
  assert.throws(
    () => resolveRuntimeConfig('local_emulator', '192.168.1.2', true),
    /local_emulator_host_not_allowed/,
  );
  assert.throws(
    () => resolveRuntimeConfig('local_emulator', '127.0.0.1', false),
    /local_emulator_requires_development_bundle/,
  );
  assert.throws(
    () => resolveRuntimeConfig('staging', '127.0.0.1', true),
    /unsupported_runtime_mode/,
  );
});

function fakeUser(overrides = {}) {
  return {
    uid: 'emulator-user',
    displayName: 'Local Member',
    email: 'local@example.invalid',
    phoneNumber: null,
    emailVerified: true,
    providerData: [{ providerId: 'password' }],
    async reload() {},
    async getIdToken() {
      return 'emulator-token';
    },
    ...overrides,
  };
}

test('auth-only gateway creates compatibility data without economic authority', async () => {
  const user = fakeUser({ emailVerified: false });
  const calls = [];
  const auth = { currentUser: user };
  const operations = {
    async create(_auth, email, password) {
      calls.push(['create', email, password]);
      return { user };
    },
    async signIn(_auth, email, password) {
      calls.push(['signIn', email, password]);
      return { user };
    },
    async signOut() {
      calls.push(['signOut']);
    },
    async updateProfile(_user, profile) {
      calls.push(['updateProfile', profile]);
    },
    async sendVerification() {
      calls.push(['sendVerification']);
    },
  };
  const gateway = new FirebaseEmulatorAuthenticationGateway(
    auth,
    operations,
  );

  const profile = await gateway.registerWithPhoneAlias(
    'alias@example.invalid',
    'password',
    'Synthetic Member',
    '081000000',
  );
  assert.equal(profile.name, 'Synthetic Member');
  assert.equal(profile.profileComplete, false);
  assert.equal(profile.currentPoints, 0);
  assert.equal(profile.tier, 'Silver');
  assert.deepEqual(calls, [
    ['create', 'alias@example.invalid', 'password'],
    ['updateProfile', { displayName: 'Synthetic Member' }],
  ]);
});

test('local Google provider fails closed', async () => {
  const gateway = new UnsupportedLocalGoogleIdentityGateway();
  gateway.configure();
  await assert.rejects(() => gateway.signIn(), /local_google_sign_in_unavailable/);
  await assert.rejects(
    () => gateway.linkCurrentAccount(),
    /local_google_sign_in_unavailable/,
  );
});

test('FastAPI member adapter bootstraps, reads, and maps minimal projection', async () => {
  const calls = [];
  const auth = { currentUser: fakeUser() };
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    return {
      ok: true,
      async json() {
        return {
          member_id: 'internal-id-must-not-enter-document',
          display_name: null,
          profile_completed: false,
          created_at: '2026-07-24T00:00:00Z',
        };
      },
    };
  };
  const repository = new FastApiMemberRepository(
    auth,
    'http://127.0.0.1:8000',
    fetcher,
  );
  const document = await new Promise((resolve, reject) => {
    repository.observe('emulator-user', resolve, () =>
      reject(new Error('unexpected error')),
    );
  });

  assert.deepEqual(document, {
    name: 'Member',
    profileComplete: false,
    joinedDate: '2026-07-24T00:00:00Z',
    currentPoints: 0,
    pendingPoints: 0,
    lifetimePoints: 0,
    tierXp: 0,
    tier: 'Silver',
    vouchers: [],
    xpHistory: [],
  });
  assert.deepEqual(
    calls.map(([url, init]) => [
      url,
      init.method,
      init.headers.Authorization,
    ]),
    [
      [
        'http://127.0.0.1:8000/api/v1/member/bootstrap',
        'POST',
        'Bearer emulator-token',
      ],
      [
        'http://127.0.0.1:8000/api/v1/member/me',
        'GET',
        'Bearer emulator-token',
      ],
    ],
  );
});

test('FastAPI member adapter ignores late results after unsubscribe', async () => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const repository = new FastApiMemberRepository(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    () => pending,
  );
  let callbacks = 0;
  const unsubscribe = repository.observe(
    'emulator-user',
    () => {
      callbacks += 1;
    },
    () => {
      callbacks += 1;
    },
  );
  unsubscribe();
  release({ ok: false, async json() {} });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(callbacks, 0);
});

test('local pending and profile adapters cannot invent or mutate state', async () => {
  const pending = new NoPendingMemberRepository();
  let summary;
  pending.observe('member', (value) => {
    summary = value;
  });
  assert.deepEqual(summary, {
    loaded: true,
    pendingCount: 0,
    pendingPoints: 0,
  });

  const profile = new UnavailableLocalProfileRepository(() => true);
  assert.equal(profile.hasCurrentIdentity(), true);
  assert.equal(await profile.getCurrent(), null);
  await assert.rejects(
    () => profile.completeCurrent('Member', '01/01/2000'),
    /local_profile_api_unavailable/,
  );
  await assert.rejects(
    () => profile.updateCurrent({ name: 'Member' }),
    /local_profile_api_unavailable/,
  );
});

test('local runtime surface has no Firestore, Storage, or transaction imports', () => {
  const files = [
    '../../src/config/firebaseLocal.ts',
    '../../src/runtime/LocalEmulatorApp.tsx',
    '../../src/navigation/LocalAppNavigator.tsx',
    '../../src/infrastructure/auth/FirebaseEmulatorAuthenticationGateway.ts',
    '../../src/infrastructure/member/FastApiMemberRepository.ts',
    '../../src/infrastructure/member/NoPendingMemberRepository.ts',
    '../../src/infrastructure/profile/UnavailableLocalProfileRepository.ts',
  ];
  const forbidden = [
    'firebase/firestore',
    'firebase/storage',
    'config/firebase',
    'TransactionService',
    'BackendApi',
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
});
