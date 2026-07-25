import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_PENDING_SUMMARY,
  applyPendingSummary,
  buildMemberData,
  reconcilePendingPoints,
} from '../../src/application/member/memberProjection.ts';
import { MemberSessionController } from '../../src/application/session/MemberSessionController.ts';
import {
  isEligibleLocalEmulatorSession,
  isEligibleSession,
  resolveSessionRoute,
} from '../../src/application/session/sessionRules.ts';

const verifiedIdentity = {
  uid: 'member-a',
  displayName: 'Firebase Name',
  email: 'member@example.com',
  phoneNumber: '+628111',
  photoURL: 'photo.png',
  emailVerified: true,
  providerIds: ['password'],
};

test('password sessions require verification while federated sessions remain eligible', () => {
  assert.equal(
    isEligibleSession({ ...verifiedIdentity, emailVerified: false }),
    false,
  );
  assert.equal(isEligibleSession(verifiedIdentity), true);
  assert.equal(
    isEligibleSession({
      ...verifiedIdentity,
      emailVerified: false,
      providerIds: ['google.com'],
    }),
    true,
  );
  assert.equal(
    isEligibleSession({
      ...verifiedIdentity,
      email: '8123456789@gongcha-id.app',
      emailVerified: false,
    }),
    true,
  );
  assert.equal(
    isEligibleLocalEmulatorSession({
      ...verifiedIdentity,
      email: '8123456789@gongcha-id.app',
      emailVerified: false,
    }),
    true,
  );
  assert.equal(
    isEligibleSession({
      ...verifiedIdentity,
      email: 'member@gongcha-id.app',
      emailVerified: false,
    }),
    false,
  );
});

test('session phases map deterministically to navigation routes', () => {
  assert.equal(resolveSessionRoute('restoring'), 'spinner');
  assert.equal(resolveSessionRoute('loading-member'), 'spinner');
  assert.equal(resolveSessionRoute('error'), 'anonymous');
  assert.equal(resolveSessionRoute('anonymous'), 'anonymous');
  assert.equal(resolveSessionRoute('needs-profile'), 'needs-profile');
  assert.equal(resolveSessionRoute('ready'), 'ready');
});

test('missing member document preserves legacy identity defaults without writes', () => {
  assert.deepEqual(
    buildMemberData(verifiedIdentity, null, EMPTY_PENDING_SUMMARY),
    {
      uid: 'member-a',
      fullName: 'Firebase Name',
      email: 'member@example.com',
      phoneNumber: '+628111',
      points: 0,
      pendingPoints: 0,
      tierXp: 0,
      tier: 'Silver',
      photoURL: 'photo.png',
      joinDate: '',
      vouchers: [],
      xpHistory: [],
      profileComplete: false,
      currentPoints: 0,
      lifetimePoints: 0,
    },
  );
});

test('member projection preserves legacy aliases and safe defaults', () => {
  const vouchers = [{ id: 'voucher', code: 'A', title: 'Tea' }];
  const xpHistory = [{ id: 'xp', amount: 10, type: 'earn' }];
  const member = buildMemberData(
    verifiedIdentity,
    {
      name: 'Legacy Name',
      phone: '+628222',
      points: 120,
      pendingPoints: 30,
      xp: 600,
      tier: 'unexpected',
      joinedDate: '2025-01-01',
      activeVouchers: vouchers,
      xpHistory,
      profileComplete: true,
    },
    EMPTY_PENDING_SUMMARY,
  );

  assert.deepEqual(member, {
    uid: 'member-a',
    fullName: 'Legacy Name',
    email: 'member@example.com',
    phoneNumber: '+628222',
    points: 120,
    pendingPoints: 30,
    tierXp: 600,
    tier: 'Silver',
    photoURL: '',
    joinDate: '2025-01-01',
    vouchers,
    xpHistory,
    profileComplete: true,
    currentPoints: 120,
    lifetimePoints: 600,
  });
});

test('pending-point reconciliation preserves the legacy clamp formula', () => {
  assert.equal(
    reconcilePendingPoints(30, {
      loaded: false,
      pendingCount: 0,
      pendingPoints: 0,
    }),
    30,
  );
  assert.equal(
    reconcilePendingPoints(30, {
      loaded: true,
      pendingCount: 0,
      pendingPoints: 30,
    }),
    0,
  );
  assert.equal(
    reconcilePendingPoints(30, {
      loaded: true,
      pendingCount: 2,
      pendingPoints: 20,
    }),
    20,
  );
  assert.equal(
    reconcilePendingPoints(30, {
      loaded: true,
      pendingCount: 2,
      pendingPoints: 0,
    }),
    30,
  );
});

function createHarness() {
  const sessionObservers = [];
  const memberObservers = [];
  const pendingObservers = [];

  const controller = new MemberSessionController(
    {
      observe(onIdentity, onError) {
        const observer = {
          onIdentity,
          onError,
          unsubscribed: false,
        };
        sessionObservers.push(observer);
        return () => {
          observer.unsubscribed = true;
        };
      },
    },
    {
      observe(uid, onMember, onError) {
        const observer = { uid, onMember, onError, unsubscribed: false };
        memberObservers.push(observer);
        return () => {
          observer.unsubscribed = true;
        };
      },
    },
    {
      observe(uid, onSummary) {
        const observer = { uid, onSummary, unsubscribed: false };
        pendingObservers.push(observer);
        return () => {
          observer.unsubscribed = true;
        };
      },
    },
    isEligibleSession,
    buildMemberData,
    applyPendingSummary,
    EMPTY_PENDING_SUMMARY,
  );

  return {
    controller,
    sessionObservers,
    memberObservers,
    pendingObservers,
    emitIdentity(identity) {
      sessionObservers.at(-1).onIdentity(identity);
    },
    failSession() {
      sessionObservers.at(-1).onError();
    },
    wasSessionUnsubscribed() {
      return sessionObservers.at(-1).unsubscribed;
    },
  };
}

test('controller projects member and pending streams into explicit phases', () => {
  const harness = createHarness();
  const states = [];
  const stop = harness.controller.observe((state) => states.push(state));

  harness.emitIdentity(verifiedIdentity);
  assert.deepEqual(states.at(-1), {
    phase: 'loading-member',
    member: null,
  });

  harness.pendingObservers[0].onSummary({
    loaded: true,
    pendingCount: 1,
    pendingPoints: 20,
  });
  harness.memberObservers[0].onMember({
    fullName: 'Ready Member',
    pendingPoints: 30,
    profileComplete: true,
  });

  assert.equal(states.at(-1).phase, 'ready');
  assert.equal(states.at(-1).member.pendingPoints, 20);

  harness.pendingObservers[0].onSummary({
    loaded: true,
    pendingCount: 0,
    pendingPoints: 0,
  });
  assert.equal(states.at(-1).member.pendingPoints, 0);

  stop();
  assert.equal(harness.memberObservers[0].unsubscribed, true);
  assert.equal(harness.pendingObservers[0].unsubscribed, true);
  assert.equal(harness.wasSessionUnsubscribed(), true);
});

test('identity changes clear old member and reject stale callbacks', () => {
  const harness = createHarness();
  const states = [];
  harness.controller.observe((state) => states.push(state));

  harness.emitIdentity(verifiedIdentity);
  const oldMemberObserver = harness.memberObservers[0];
  oldMemberObserver.onMember({
    fullName: 'Member A',
    profileComplete: true,
  });
  assert.equal(states.at(-1).member.uid, 'member-a');

  harness.emitIdentity({ ...verifiedIdentity, uid: 'member-b' });
  assert.deepEqual(states.at(-1), {
    phase: 'loading-member',
    member: null,
  });
  assert.equal(oldMemberObserver.unsubscribed, true);

  oldMemberObserver.onMember({
    fullName: 'Stale Member A',
    profileComplete: true,
  });
  assert.deepEqual(states.at(-1), {
    phase: 'loading-member',
    member: null,
  });

  harness.memberObservers[1].onMember(null);
  assert.equal(states.at(-1).phase, 'needs-profile');
  assert.equal(states.at(-1).member.uid, 'member-b');
});

test('explicit member refresh converges only after a complete projection', async () => {
  const harness = createHarness();
  const states = [];
  harness.controller.observe((state) => states.push(state));

  harness.emitIdentity(verifiedIdentity);
  harness.memberObservers[0].onMember({
    fullName: 'Incomplete Member',
    profileComplete: false,
  });
  assert.equal(states.at(-1).phase, 'needs-profile');

  const refresh = harness.controller.refreshMember();
  assert.equal(harness.memberObservers[0].unsubscribed, true);
  assert.equal(harness.pendingObservers[0].unsubscribed, true);
  assert.equal(states.at(-1).phase, 'needs-profile');
  assert.equal(harness.memberObservers.length, 2);

  harness.memberObservers[1].onMember({
    fullName: 'Complete Member',
    profileComplete: true,
  });
  await refresh;
  assert.equal(states.at(-1).phase, 'ready');
  assert.equal(states.at(-1).member.fullName, 'Complete Member');
});

test('failed explicit refresh preserves the recoverable profile screen state', async () => {
  const harness = createHarness();
  const states = [];
  harness.controller.observe((state) => states.push(state));

  harness.emitIdentity(verifiedIdentity);
  harness.memberObservers[0].onMember({
    fullName: 'Incomplete Member',
    profileComplete: false,
  });
  const beforeRefresh = states.at(-1);

  const refresh = harness.controller.refreshMember();
  harness.memberObservers[1].onError();
  await assert.rejects(refresh, /member_refresh_failed/);
  assert.deepEqual(states.at(-1), beforeRefresh);
});

test('stopped session subscriptions cannot mutate a restarted controller', () => {
  const harness = createHarness();
  const firstStates = [];
  const stopFirst = harness.controller.observe((state) =>
    firstStates.push(state),
  );
  const staleSessionObserver = harness.sessionObservers[0];
  stopFirst();

  const currentStates = [];
  harness.controller.observe((state) => currentStates.push(state));
  staleSessionObserver.onIdentity(verifiedIdentity);
  assert.deepEqual(currentStates.at(-1), {
    phase: 'restoring',
    member: null,
  });
  assert.equal(harness.memberObservers.length, 0);

  harness.emitIdentity(null);
  assert.deepEqual(currentStates.at(-1), {
    phase: 'anonymous',
    member: null,
  });
});

test('ineligible sessions and observer errors fail closed', () => {
  const harness = createHarness();
  const states = [];
  harness.controller.observe((state) => states.push(state));

  harness.emitIdentity({ ...verifiedIdentity, emailVerified: false });
  assert.deepEqual(states.at(-1), { phase: 'anonymous', member: null });
  assert.equal(harness.memberObservers.length, 0);

  harness.emitIdentity(verifiedIdentity);
  harness.memberObservers[0].onMember({
    profileComplete: true,
  });
  harness.memberObservers[0].onError();
  assert.deepEqual(states.at(-1), { phase: 'error', member: null });

  harness.emitIdentity(verifiedIdentity);
  harness.memberObservers[1].onMember({
    profileComplete: true,
  });
  harness.failSession();
  assert.deepEqual(states.at(-1), { phase: 'error', member: null });
});
