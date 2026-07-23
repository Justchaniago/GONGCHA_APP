import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { AuthCommands } from '../../src/application/auth/AuthCommands.ts';
import { GoogleIdentityCommands } from '../../src/application/auth/GoogleIdentityCommands.ts';
import { ProfileCommands } from '../../src/application/profile/ProfileCommands.ts';
import {
  didSecurityScopeChange,
  isSecurityPinValid,
  isUnlockFresh,
  shouldRelock,
} from '../../src/application/security/securityRules.ts';

function createAuthGateway() {
  const calls = [];
  const profile = { uid: 'member', name: 'Member', tier: 'Silver' };
  return {
    calls,
    profile,
    async loginWithPhoneAlias(...args) {
      calls.push(['loginWithPhoneAlias', ...args]);
      return profile;
    },
    async registerWithPhoneAlias(...args) {
      calls.push(['registerWithPhoneAlias', ...args]);
      return profile;
    },
    async registerWithEmail(...args) {
      calls.push(['registerWithEmail', ...args]);
      return profile;
    },
    async loginWithEmail(...args) {
      calls.push(['loginWithEmail', ...args]);
      return profile;
    },
    async resendVerificationEmail(...args) {
      calls.push(['resendVerificationEmail', ...args]);
    },
    async sendPasswordReset(...args) {
      calls.push(['sendPasswordReset', ...args]);
    },
    async confirmPasswordReset(...args) {
      calls.push(['confirmPasswordReset', ...args]);
    },
    async applyEmailVerificationCode(...args) {
      calls.push(['applyEmailVerificationCode', ...args]);
    },
    async autoLoginAfterEmailVerification(...args) {
      calls.push(['autoLoginAfterEmailVerification', ...args]);
      return profile;
    },
    async changePassword(...args) {
      calls.push(['changePassword', ...args]);
    },
    async logout() {
      calls.push(['logout']);
    },
    currentSubject() {
      calls.push(['currentSubject']);
      return 'member';
    },
    currentIdentity() {
      calls.push(['currentIdentity']);
      return {
        uid: 'member',
        displayName: 'Member',
        email: null,
        phoneNumber: null,
        providerIds: ['password'],
      };
    },
  };
}

test('auth commands preserve every legacy command boundary', async () => {
  const gateway = createAuthGateway();
  const commands = new AuthCommands(gateway);

  assert.equal(await commands.loginWithPhoneAlias('phone', 'pass'), gateway.profile);
  assert.equal(
    await commands.registerWithPhoneAlias('phone', 'pass', 'Name', '081'),
    gateway.profile,
  );
  assert.equal(
    await commands.registerWithEmail('a@b.com', 'pass', 'Name', '081'),
    gateway.profile,
  );
  assert.equal(await commands.loginWithEmail('a@b.com', 'pass'), gateway.profile);
  await commands.resendVerificationEmail('a@b.com', 'pass');
  await commands.sendPasswordReset('a@b.com');
  await commands.confirmPasswordReset('code', 'new');
  await commands.applyEmailVerificationCode('code');
  assert.equal(
    await commands.autoLoginAfterEmailVerification('a@b.com', 'pass'),
    gateway.profile,
  );
  await commands.changePassword('old', 'new');
  await commands.logout();
  assert.equal(commands.currentSubject(), 'member');
  assert.equal(commands.currentIdentity().uid, 'member');

  assert.deepEqual(gateway.calls, [
    ['loginWithPhoneAlias', 'phone', 'pass'],
    ['registerWithPhoneAlias', 'phone', 'pass', 'Name', '081'],
    ['registerWithEmail', 'a@b.com', 'pass', 'Name', '081'],
    ['loginWithEmail', 'a@b.com', 'pass'],
    ['resendVerificationEmail', 'a@b.com', 'pass'],
    ['sendPasswordReset', 'a@b.com'],
    ['confirmPasswordReset', 'code', 'new'],
    ['applyEmailVerificationCode', 'code'],
    ['autoLoginAfterEmailVerification', 'a@b.com', 'pass'],
    ['changePassword', 'old', 'new'],
    ['logout'],
    ['currentSubject'],
    ['currentIdentity'],
  ]);
});

test('auth commands preserve provider errors for compatibility mapping', async () => {
  const providerError = new Error('auth/invalid-credential');
  const gateway = createAuthGateway();
  gateway.loginWithEmail = async () => {
    throw providerError;
  };

  await assert.rejects(
    new AuthCommands(gateway).loginWithEmail('a@b.com', 'bad'),
    (error) => error === providerError,
  );
});

test('Google commands preserve configure, sign-in, link, and sign-out order', async () => {
  const calls = [];
  const commands = new GoogleIdentityCommands({
    configure() {
      calls.push('configure');
    },
    async signIn() {
      calls.push('signIn');
    },
    async linkCurrentAccount() {
      calls.push('link');
    },
    async signOut() {
      calls.push('signOut');
    },
  });

  commands.configure();
  await commands.signIn();
  await commands.linkCurrentAccount();
  await commands.signOut();
  assert.deepEqual(calls, ['configure', 'signIn', 'link', 'signOut']);
});

test('profile commands preserve reads, updates, completion, and image result', async () => {
  const calls = [];
  const profile = { uid: 'member', name: 'Name', tier: 'Silver' };
  const commands = new ProfileCommands(
    {
      hasCurrentIdentity() {
        calls.push(['hasIdentity']);
        return true;
      },
      async getCurrent() {
        calls.push(['get']);
        return profile;
      },
      async updateCurrent(updates) {
        calls.push(['update', updates]);
      },
      async completeCurrent(name, dateOfBirth) {
        calls.push(['complete', name, dateOfBirth]);
      },
    },
    {
      async pickSquareImage() {
        calls.push(['pick']);
        return { kind: 'selected', dataUri: 'data:image/jpeg;base64,A' };
      },
    },
  );

  assert.equal(commands.hasCurrentIdentity(), true);
  assert.equal(await commands.getCurrent(), profile);
  await commands.updateCurrent({ name: 'Next' });
  await commands.completeCurrent('  Full Name  ', '01/01/2000');
  assert.deepEqual(await commands.pickImage(), {
    kind: 'selected',
    dataUri: 'data:image/jpeg;base64,A',
  });
  assert.deepEqual(calls, [
    ['hasIdentity'],
    ['get'],
    ['update', { name: 'Next' }],
    ['complete', 'Full Name', '01/01/2000'],
    ['pick'],
  ]);
});

test('security PIN format is exactly six numeric digits', () => {
  assert.equal(isSecurityPinValid('123456'), true);
  for (const invalid of ['12345', '1234567', '12345a', ' 123456', '']) {
    assert.equal(isSecurityPinValid(invalid), false);
  }
});

test('security scope changes are explicit account-isolation boundaries', () => {
  assert.equal(didSecurityScopeChange('member-a', 'member-b'), true);
  assert.equal(didSecurityScopeChange('member-a', 'guest'), true);
  assert.equal(didSecurityScopeChange('member-a', 'member-a'), false);
});

test('unlock freshness preserves legacy grace boundary behavior', () => {
  assert.equal(isUnlockFresh(0, 1000, 100), false);
  assert.equal(isUnlockFresh(1001, 1000, 100), true);
  assert.equal(isUnlockFresh(950, 1000, 100), true);
  assert.equal(isUnlockFresh(900, 1000, 100), false);
  assert.equal(isUnlockFresh(899, 1000, 100), false);
});

test('relock requires PIN, app lock, expired background, and stale unlock', () => {
  const input = {
    pinEnabled: true,
    appLockEnabled: true,
    backgroundAt: 800,
    lastUnlockAt: 0,
    now: 1000,
    gracePeriodMs: 100,
  };
  assert.equal(shouldRelock(input), true);
  assert.equal(shouldRelock({ ...input, pinEnabled: false }), false);
  assert.equal(shouldRelock({ ...input, appLockEnabled: false }), false);
  assert.equal(shouldRelock({ ...input, backgroundAt: 950 }), false);
  assert.equal(shouldRelock({ ...input, lastUnlockAt: 950 }), false);
});

test('presentation and application boundaries contain no provider imports', () => {
  const providerFreeFiles = [
    'src/application/auth/AuthCommands.ts',
    'src/application/auth/GoogleIdentityCommands.ts',
    'src/application/profile/ProfileCommands.ts',
    'src/application/security/securityRules.ts',
    'src/context/SecurityContext.tsx',
    'src/screens/WelcomeScreen.tsx',
    'src/screens/LoginScreen.tsx',
    'src/screens/ProfileCompletionScreen.tsx',
    'src/screens/EditProfileScreen.tsx',
    'src/screens/UpdatePasswordScreen.tsx',
    'src/screens/ProfileScreen.tsx',
    'src/services/AuthService.ts',
    'src/services/GoogleSignInService.ts',
    'src/services/SecurityStorage.ts',
  ];
  const forbidden = [
    'firebase/auth',
    'firebase/firestore',
    'expo-local-authentication',
    'expo-image-picker',
    '@react-native-async-storage/async-storage',
    'expo-crypto',
    'expo-secure-store',
  ];

  for (const file of providerFreeFiles) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    for (const dependency of forbidden) {
      assert.equal(
        source.includes(dependency),
        false,
        `${file} must not import ${dependency}`,
      );
    }
  }
});

test('legacy providers remain isolated in infrastructure adapters', () => {
  const expectedBindings = new Map([
    ['src/infrastructure/auth/FirebaseAuthenticationGateway.ts', 'firebase/auth'],
    ['src/infrastructure/auth/FirebaseGoogleIdentityGateway.ts', 'firebase/auth'],
    ['src/infrastructure/auth/ExpoSavedLoginCredentialCapability.ts', 'expo-secure-store'],
    ['src/infrastructure/profile/FirestoreProfileRepository.ts', 'firebase/firestore'],
    ['src/infrastructure/profile/ExpoProfileImageCapability.ts', 'expo-image-picker'],
    ['src/infrastructure/security/LegacySecurityRepository.ts', 'expo-crypto'],
    ['src/infrastructure/security/ExpoBiometricCapability.ts', 'expo-local-authentication'],
  ]);

  for (const [file, dependency] of expectedBindings) {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    assert.equal(source.includes(dependency), true, `${file} binds ${dependency}`);
  }
});
