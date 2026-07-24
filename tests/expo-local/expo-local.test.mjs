import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { resolveRuntimeConfig } from '../../src/config/runtime.ts';
import { FirebaseEmulatorAuthenticationGateway } from '../../src/infrastructure/auth/FirebaseEmulatorAuthenticationGateway.ts';
import { UnsupportedLocalGoogleIdentityGateway } from '../../src/infrastructure/auth/UnsupportedLocalGoogleIdentityGateway.ts';
import { FastApiMemberRepository } from '../../src/infrastructure/member/FastApiMemberRepository.ts';
import { NoPendingMemberRepository } from '../../src/infrastructure/member/NoPendingMemberRepository.ts';
import {
  FastApiProfileRepository,
} from '../../src/infrastructure/profile/FastApiProfileRepository.ts';
import { toIsoDateOfBirth } from '../../src/application/profile/profileValidation.ts';
import {
  isValidDateOfBirth,
  isValidProfileName,
} from '../../src/application/profile/profileValidation.ts';

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

test('local pending adapter cannot invent economic state', async () => {
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

});

test('FastAPI profile adapter validates DOB, writes allow-listed fields, and reads projection', async () => {
  const calls = [];
  const profile = new FastApiProfileRepository(
    { currentUser: fakeUser() },
    'http://127.0.0.1:8000',
    toIsoDateOfBirth,
    async (url, init) => {
      calls.push([url, init]);
      return {
        ok: true,
        async json() {
          return {
            display_name: 'Local Member',
            profile_completed: true,
            created_at: '2026-07-24T00:00:00Z',
          };
        },
      };
    },
  );

  assert.equal(profile.hasCurrentIdentity(), true);
  const today = new Date(2026, 6, 24);
  assert.equal(toIsoDateOfBirth('29/02/2000'), '2000-02-29');
  assert.equal(isValidDateOfBirth('24/07/2026', today), true);
  assert.equal(isValidDateOfBirth('25/07/2026', today), false);
  assert.equal(isValidProfileName('Member'), true);
  assert.equal(isValidProfileName('x'.repeat(161)), false);
  assert.throws(
    () => toIsoDateOfBirth('29/02/2001'),
    /date_of_birth_invalid/,
  );

  await profile.completeCurrent('Local Member', '29/02/2000');
  assert.deepEqual(await profile.getCurrent(), {
    uid: 'emulator-user',
    name: 'Local Member',
    phoneNumber: undefined,
    email: 'local@example.invalid',
    tier: 'Silver',
    joinedDate: '2026-07-24T00:00:00Z',
    profileComplete: true,
  });
  assert.deepEqual(
    calls.map(([url, init]) => ({
      url,
      method: init.method,
      authorization: init.headers.Authorization,
      contentType: init.headers['Content-Type'],
      body: init.body,
    })),
    [
      {
        url: 'http://127.0.0.1:8000/api/v1/member/profile/complete',
        method: 'POST',
        authorization: 'Bearer emulator-token',
        contentType: 'application/json',
        body: JSON.stringify({
          display_name: 'Local Member',
          date_of_birth: '2000-02-29',
        }),
      },
      {
        url: 'http://127.0.0.1:8000/api/v1/member/me',
        method: 'GET',
        authorization: 'Bearer emulator-token',
        contentType: undefined,
        body: undefined,
      },
    ],
  );
  await assert.rejects(
    () => profile.updateCurrent({ name: 'Changed' }),
    /local_profile_update_not_supported/,
  );
});

test('local runtime surface has no Firestore, Storage, or transaction imports', () => {
  const files = [
    '../../src/config/firebaseLocal.ts',
    '../../src/runtime/LocalEmulatorApp.tsx',
    '../../src/navigation/LocalAppNavigator.tsx',
    '../../src/screens/LocalDashboardScreen.tsx',
    '../../src/infrastructure/auth/FirebaseEmulatorAuthenticationGateway.ts',
    '../../src/infrastructure/member/FastApiMemberRepository.ts',
    '../../src/infrastructure/member/NoPendingMemberRepository.ts',
    '../../src/infrastructure/profile/FastApiProfileRepository.ts',
  ];
  const forbidden = [
    'firebase/firestore',
    'firebase/storage',
    'config/firebase',
    'TransactionService',
    'BackendApi',
    'UserService',
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

test('welcome auth flow delegates routing to session state', () => {
  const source = readFileSync(
    new URL('../../src/screens/WelcomeScreen.tsx', import.meta.url),
    'utf8',
  );
  assert.equal(source.includes("navigation.navigate('MainApp')"), false);
});

test('ready local session uses isolated dashboard with application logout', () => {
  const navigator = readFileSync(
    new URL('../../src/navigation/LocalAppNavigator.tsx', import.meta.url),
    'utf8',
  );
  const dashboard = readFileSync(
    new URL('../../src/screens/LocalDashboardScreen.tsx', import.meta.url),
    'utf8',
  );
  assert.equal(navigator.includes("route === 'ready'"), true);
  assert.equal(navigator.includes('name="LocalDashboard"'), true);
  assert.equal(dashboard.includes('await authCommands.logout()'), true);
});

test('local navigator excludes the unauthenticated legacy Login route', () => {
  const source = readFileSync(
    new URL('../../src/navigation/LocalAppNavigator.tsx', import.meta.url),
    'utf8',
  );
  assert.equal(source.includes('LoginScreen'), false);
  assert.equal(source.includes('name="Login"'), false);
});
