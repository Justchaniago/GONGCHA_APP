import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildLegacyHomeLoyaltyViewModel,
  buildLocalHomeLoyaltyViewModel,
} from '../../src/application/homeLoyalty/HomeLoyaltyViewModel.ts';

function legacyMember(overrides = {}) {
  return {
    uid: 'member-1',
    fullName: 'Test Member',
    tier: 'Silver',
    tierXp: 500,
    points: 125,
    currentPoints: 125,
    pendingPoints: 25,
    ...overrides,
  };
}

function localSummary(overrides = {}) {
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

test('legacy Home presenter preserves loyalty and wallet output', () => {
  const model = buildLegacyHomeLoyaltyViewModel(legacyMember());
  assert.equal(model.theme, 'legacy-silver');
  assert.equal(model.tierDisplayName, 'Silver');
  assert.equal(model.progressValueLabel, '500 / 5000 XP');
  assert.equal(model.progressPercent, 10);
  assert.equal(model.progressMessage, '4500 XP to reach next Tier!');
  assert.equal(model.walletValueLabel, '125');
  assert.equal(model.walletValueCaption, 'Available points');
  assert.match(model.walletNotice, /25 pts pending validation/);
  assert.equal(model.walletActionLabel, 'Redeem Catalog');
});

test('legacy Home presenter preserves terminal Platinum behavior', () => {
  const model = buildLegacyHomeLoyaltyViewModel(
    legacyMember({ tier: 'Platinum', tierXp: 18000 }),
  );
  assert.equal(model.theme, 'legacy-platinum');
  assert.equal(model.progressPercent, 100);
  assert.equal(model.progressMessage, 'You are Top Tier!');
});

test('local Home presenter passes backend-owned semantics unchanged', () => {
  const model = buildLocalHomeLoyaltyViewModel(localSummary());
  assert.equal(model.theme, 'candidate-master');
  assert.equal(model.tierDisplayName, 'Gong cha Master');
  assert.equal(model.progressValueLabel, '100 / 800 Leaves');
  assert.equal(model.progressPercent, 0);
  assert.equal(
    model.progressMessage,
    '700 Leaves menuju Gong cha Ambassador',
  );
  assert.equal(model.walletValueLabel, '75');
  assert.equal(model.walletValueCaption, 'Available Leaves');
  assert.match(model.walletNotice, /Pending belum didukung/);
  assert.match(model.walletNotice, /belum menjadi entitlement/);
  assert.equal(model.walletActionLabel, 'Lihat Activity');
});

test('local Home presenter preserves terminal Legend contract', () => {
  const model = buildLocalHomeLoyaltyViewModel(
    localSummary({
      availableLeaves: 1600,
      qualifyingLeaves: 1600,
      tier: {
        code: 'LEGEND',
        displayName: 'Gong cha Legend',
        currentThreshold: 1600,
        nextCode: null,
        nextDisplayName: null,
        nextThreshold: null,
        remaining: 0,
        progressPercent: 100,
      },
    }),
  );
  assert.equal(model.theme, 'candidate-legend');
  assert.equal(model.progressValueLabel, '1.600 / 1.600 Leaves');
  assert.equal(model.progressPercent, 100);
  assert.equal(model.progressMessage, 'Tier kandidat tertinggi tercapai');
});

test('legacy and local Home wrappers share pure V1 regions', () => {
  const shared = readFileSync(
    new URL(
      '../../src/presentation/homeLoyalty/HomeLoyaltyWalletView.tsx',
      import.meta.url,
    ),
    'utf8',
  );
  const legacy = readFileSync(
    new URL('../../src/screens/HomeScreen.tsx', import.meta.url),
    'utf8',
  );
  const local = readFileSync(
    new URL('../../src/screens/LocalDashboardScreen.tsx', import.meta.url),
    'utf8',
  );
  const presenter = readFileSync(
    new URL(
      '../../src/application/homeLoyalty/HomeLoyaltyViewModel.ts',
      import.meta.url,
    ),
    'utf8',
  );

  for (const wrapper of [legacy, local]) {
    assert.equal(wrapper.includes('<HomeMembershipRegion'), true);
    assert.equal(wrapper.includes('<HomeWalletRegion'), true);
  }
  assert.equal(
    legacy.includes('buildLegacyHomeLoyaltyViewModel'),
    true,
  );
  assert.equal(local.includes('buildLocalHomeLoyaltyViewModel'), true);
  assert.equal(local.includes('useLocalLoyaltySummary'), true);
  assert.equal(local.includes('RefreshControl'), true);

  for (const forbidden of [
    'useMember',
    'firebase',
    'Firestore',
    'Repository',
    'Service',
    'TIER_LIMITS',
    'tierXp /',
    'target -',
  ]) {
    assert.equal(
      shared.includes(forbidden),
      false,
      `shared contains ${forbidden}`,
    );
  }
  for (const forbidden of [
    'firebaseAuth',
    'NotificationService',
    'usePromotions',
    "navigate('Rewards')",
    'setTimeout',
  ]) {
    assert.equal(
      local.includes(forbidden),
      false,
      `local contains ${forbidden}`,
    );
  }
  for (const evidence of [
    'borderRadius: 22',
    'shadowRadius: 20',
    "require('../../../assets/images/liquid.webp')",
    'HomeMembershipRegion',
    'HomeWalletRegion',
  ]) {
    assert.equal(shared.includes(evidence), true, `missing ${evidence}`);
  }
  for (const theme of [
    "'candidate-lover'",
    "'candidate-master'",
    "'candidate-ambassador'",
    "'candidate-legend'",
  ]) {
    assert.equal(presenter.includes(theme), true, `missing ${theme}`);
  }
  assert.equal(presenter.includes('FAMILY'), false);
});
