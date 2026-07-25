import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loginLocalMember,
  getLocalMemberProfile,
  getLocalMemberSummary,
} from '../../src/application/session/LocalSessionController.ts';

test('loginLocalMember parses access_token and member_uid correctly', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      access_token: 'test-jwt-token-123',
      token_type: 'bearer',
      member_uid: 'mem-888',
    }),
  });

  globalThis.fetch = mockFetch;

  const result = await loginLocalMember('+628123456789', '123456', 'http://localhost:8000');
  assert.equal(result.accessToken, 'test-jwt-token-123');
  assert.equal(result.memberUid, 'mem-888');
});

test('getLocalMemberSummary maps loyalty leaves and tier correctly', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      member_uid: 'mem-888',
      tier: 'AMBASSADOR',
      available_leaves: 1500,
      qualifying_leaves: 2000,
    }),
  });

  globalThis.fetch = mockFetch;

  const summary = await getLocalMemberSummary('mem-888', 'http://localhost:8000');
  assert.equal(summary.tier, 'AMBASSADOR');
  assert.equal(summary.availableLeaves, 1500);
  assert.equal(summary.qualifyingLeaves, 2000);
});
