import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLegacyRewardsViewModel,
  buildLocalRewardsViewModel,
} from '../../src/application/rewards/RewardsViewModel.ts';

test('buildLegacyRewardsViewModel formats legacy rewards correctly', () => {
  const member = { currentPoints: 1000, pendingPoints: 200 };
  const rewards = [{ id: '1', title: 'Free Pearl Milk Tea', pointsrequired: 500, description: 'Tasty' }];
  const vouchers = [{ id: 'v1', code: 'GC-123', title: 'Free Pearl', status: 'active', expiryDate: '2026-12-31' }];

  const model = buildLegacyRewardsViewModel(member, rewards, vouchers);
  assert.equal(model.availableLeavesLabel, '1.000 Leaves');
  assert.equal(model.catalogItems[0].canAfford, true);
  assert.equal(model.catalogItems[0].actionLabel, 'Tukar');
});

test('buildLocalRewardsViewModel formats FastAPI summary correctly', () => {
  const member = { fullName: 'Local User' };
  const summary = { leaves_balance: 400, pending_leaves: 0 };
  const catalog = [{ id: 'c1', title: 'Diskon 50%', pointsRequired: 500 }];
  const vouchers = [];

  const model = buildLocalRewardsViewModel(member, summary, catalog, vouchers);
  assert.equal(model.availableLeavesLabel, '400 Leaves');
  assert.equal(model.catalogItems[0].canAfford, false);
  assert.equal(model.catalogItems[0].actionLabel, '100 Leaves Lagi');
});
