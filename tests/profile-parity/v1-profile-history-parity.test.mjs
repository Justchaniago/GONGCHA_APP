import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildLegacyProfileParityViewModel,
  buildLocalProfileParityViewModel,
} from '../../src/application/profileParity/ProfileParityViewModel.ts';

function member(overrides = {}) {
  return {
    uid: 'member-1',
    fullName: 'Test Member',
    email: 'member@example.com',
    phoneNumber: '08123456789',
    points: 125,
    currentPoints: 125,
    pendingPoints: 25,
    lifetimePoints: 700,
    tierXp: 500,
    tier: 'Silver',
    ...overrides,
  };
}

function summary(overrides = {}) {
  return {
    availableLeaves: 75,
    qualifyingLeaves: 100,
    pending: { state: 'unsupported', leaves: null },
    tier: {
      code: 'MASTER',
      displayName: 'Gong cha Master',
      currentThreshold: 100,
      nextCode: 'AMBASSADOR',
      nextDisplayName: 'Gong cha Ambassador',
      nextThreshold: 800,
      remaining: 700,
      progressPercent: 0,
    },
    policyVersion: 'gongcha-tier-candidate-v1',
    ...overrides,
  };
}

test('legacy Profile presenter preserves identity, stats, and history output', () => {
  const now = new Date(2026, 6, 25, 12).getTime();
  const createdAtIso = new Date(2026, 6, 25, 10, 30).toISOString();
  const model = buildLegacyProfileParityViewModel(
    member(),
    [
      {
        id: 'tx-1',
        createdAtIso,
        status: 'verified',
        type: 'earn',
        pointsAmount: 20,
        title: 'Points released',
        storeLabel: 'Gong Cha Mall',
        referenceLabel: 'ORDER-1',
        isPending: false,
        totalAmount: 50000,
      },
    ],
    1,
    now,
  );
  assert.equal(model.identity.fullName, 'Test Member');
  assert.equal(model.identity.phoneNumber, '08123456789');
  assert.equal(model.identity.badgeLabel, null);
  assert.deepEqual(
    model.stats.map(({ label, valueLabel, hint }) => [
      label,
      valueLabel,
      hint,
    ]),
    [
      ['Available Points', '125', 'Ready to redeem'],
      ['Pending Points', '25', 'Awaiting validation'],
    ],
  );
  assert.equal(model.history.title, 'Transaction History');
  assert.equal(model.history.items[0].dayLabel, 'Today');
  assert.equal(model.history.items[0].pointsLabel, '+20 pts');
  assert.equal(model.history.items[0].transactionAmountLabel, 'Rp 50.000');
  assert.equal(model.history.items[0].referenceLabel, 'Ref ORDER-1');
});

test('legacy Profile presenter retains day pagination and status semantics', () => {
  const now = new Date(2026, 6, 25, 12).getTime();
  const items = [
    {
      id: 'pending',
      createdAtIso: new Date(2026, 6, 25, 10).toISOString(),
      status: 'pending',
      type: 'earn',
      pointsAmount: 10,
      title: 'Points pending validation',
      storeLabel: '',
      referenceLabel: '',
      isPending: true,
    },
    {
      id: 'redeem',
      createdAtIso: new Date(2026, 6, 24, 10).toISOString(),
      status: 'verified',
      type: 'redeem',
      pointsAmount: -20,
      title: 'Reward redemption',
      storeLabel: '',
      referenceLabel: '',
      isPending: false,
      voucherTitle: 'Free Drink',
    },
  ];
  const firstDay = buildLegacyProfileParityViewModel(
    member({ tier: 'Platinum' }),
    items,
    1,
    now,
  );
  assert.equal(firstDay.identity.badgeLabel, 'PLATINUM MEMBER');
  assert.deepEqual(
    firstDay.history.items.map((item) => item.id),
    ['pending'],
  );
  assert.equal(firstDay.history.items[0].statusLabel, 'Pending validation');
  assert.equal(firstDay.history.hasMore, true);

  const bothDays = buildLegacyProfileParityViewModel(
    member(),
    items,
    2,
    now,
  );
  assert.deepEqual(
    bothDays.history.items.map((item) => item.id),
    ['pending', 'redeem'],
  );
  assert.equal(bothDays.history.items[1].title, 'Free Drink');
  assert.equal(bothDays.history.items[1].dayLabel, 'Yesterday');
});

test('local Profile presenter passes FastAPI member, summary, and activity', () => {
  const now = new Date(2026, 6, 25, 12).getTime();
  const model = buildLocalProfileParityViewModel(
    member(),
    summary(),
    [
      {
        activityId: 'activity-1',
        eventType: 'refund_reversal',
        pointsDelta: -5,
        status: 'posted',
        activityAt: new Date(2026, 6, 25, 9).toISOString(),
        externalOrderReference: 'ORDER-1',
      },
    ],
    true,
    now,
  );
  assert.equal(model.identity.badgeLabel, 'GONG CHA MASTER');
  assert.deepEqual(
    model.stats.map(({ label, valueLabel, hint }) => [
      label,
      valueLabel,
      hint,
    ]),
    [
      ['Available Leaves', '75', 'Authoritative balance'],
      ['Pending Leaves', '—', 'Not supported yet'],
    ],
  );
  assert.equal(model.history.title, 'Loyalty Activity');
  assert.equal(model.history.items[0].title, 'Points reversed');
  assert.equal(model.history.items[0].pointsLabel, '-5 Leaves');
  assert.equal(model.history.items[0].referenceLabel, 'Ref ORDER-1');
  assert.equal(model.history.hasMore, true);
});

test('legacy and local wrappers share pure V1 Profile presentation', () => {
  const shared = readFileSync(
    new URL(
      '../../src/presentation/profileParity/ProfileParityView.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  const legacy = readFileSync(
    new URL('../../src/screens/ProfileScreen.tsx', import.meta.url),
    'utf8',
  );
  const local = readFileSync(
    new URL('../../src/screens/LocalProfileScreen.tsx', import.meta.url),
    'utf8',
  );
  const navigator = readFileSync(
    new URL('../../src/navigation/LocalAppNavigator.tsx', import.meta.url),
    'utf8',
  );

  for (const wrapper of [legacy, local]) {
    assert.equal(wrapper.includes('<ProfileIdentityStatsView'), true);
    assert.equal(wrapper.includes('<ProfileHistorySheet'), true);
  }
  assert.equal(
    legacy.includes('buildLegacyProfileParityViewModel'),
    true,
  );
  assert.equal(local.includes('buildLocalProfileParityViewModel'), true);
  assert.equal(local.includes('useLocalLoyaltySummary'), true);
  assert.equal(local.includes('useLocalLoyaltyActivity'), true);
  assert.equal(navigator.includes('LocalProfile'), true);

  for (const forbidden of [
    'useMember',
    'firebase',
    'Firestore',
    'Repository',
    'Service',
    'TransactionService',
    'TIER_LIMITS',
    'progressPercent /',
  ]) {
    assert.equal(
      shared.includes(forbidden),
      false,
      `shared contains ${forbidden}`,
    );
  }
  for (const forbidden of [
    'firebaseAuth',
    'TransactionService',
    'Notification',
    'Google',
    'EditProfile',
    'UpdatePassword',
    'delete',
  ]) {
    assert.equal(
      local.includes(forbidden),
      false,
      `local contains ${forbidden}`,
    );
  }
  for (const evidence of [
    'damping: 20',
    'duration: 300',
    'duration: 250',
    'duration: 200',
    'duration: 150',
    'borderTopLeftRadius: 24',
    'onTabBarVisibilityChange',
    'ListEmptyComponent',
    'onEndReached',
  ]) {
    assert.equal(shared.includes(evidence), true, `missing ${evidence}`);
  }
});
