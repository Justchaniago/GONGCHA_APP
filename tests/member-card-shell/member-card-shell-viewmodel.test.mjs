import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLegacyMemberCardShellViewModel,
  buildLocalMemberCardShellViewModel,
} from '../../src/application/memberCardShell/MemberCardShellViewModel.ts';

test('buildLegacyMemberCardShellViewModel formats legacy member data correctly', () => {
  const legacyMember = {
    uid: 'user-123',
    fullName: 'John Doe',
    currentPoints: 1250,
    pendingPoints: 50,
    tier: 'Gold',
    joinDate: '2026-01-01T00:00:00.000Z',
  };
  const vm = buildLegacyMemberCardShellViewModel(true, { x: 100, y: 200, size: 40 }, legacyMember);

  assert.equal(vm.visible, true);
  assert.equal(vm.memberName, 'John Doe');
  assert.equal(vm.availableLeavesText, '1.250');
  assert.equal(vm.pendingLeavesText, '50 pending');
  assert.equal(vm.tierName, 'GOLD');
  assert.equal(vm.qrValue, 'user-123');
  assert.equal(vm.showQrCode, true);
});

test('buildLocalMemberCardShellViewModel formats FastAPI summary correctly with disabled QR', () => {
  const member = {
    displayName: 'Jane Smith',
    createdAt: '2026-02-15T00:00:00.000Z',
  };
  const summary = {
    tier: 'AMBASSADOR',
    availableLeaves: 3400,
    qualifyingLeaves: 4200,
  };
  const vm = buildLocalMemberCardShellViewModel(true, null, member, summary);

  assert.equal(vm.visible, true);
  assert.equal(vm.memberName, 'Jane Smith');
  assert.equal(vm.availableLeavesText, '3.400');
  assert.equal(vm.pendingLeavesText, '— / Not supported yet');
  assert.equal(vm.tierName, 'AMBASSADOR');
  assert.equal(vm.showQrCode, false);
  assert.equal(vm.qrPlaceholderText, 'QR payload gated until security policy approved');
});
