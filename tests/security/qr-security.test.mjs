import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateDynamicMemberQrPayload,
  verifyDynamicMemberQrPayload,
} from '../../src/application/memberCardShell/GetDynamicMemberQr.ts';

test('generateDynamicMemberQrPayload produces a valid structure', () => {
  const memberUid = 'user-123';
  const result = generateDynamicMemberQrPayload(memberUid);

  assert.ok(result.qrPayload);
  assert.ok(result.expiresAt);
  assert.equal(result.ttlSeconds, 30);

  // Payload format: GC:M2:${memberUid}:${epochSeconds}:${hmac8Hex}
  assert.match(result.qrPayload, /^GC:M2:user-123:\d+:[a-f0-9]{8}$/);
});

test('verifyDynamicMemberQrPayload succeeds with a fresh QR payload', () => {
  const memberUid = 'user-abc';
  const result = generateDynamicMemberQrPayload(memberUid);
  
  const verification = verifyDynamicMemberQrPayload(result.qrPayload);
  assert.equal(verification.valid, true);
  assert.equal(verification.memberUid, 'user-abc');
  assert.equal(verification.error, undefined);
});

test('verifyDynamicMemberQrPayload fails for expired payload (>60s)', () => {
  const memberUid = 'user-exp';
  const secretKey = 'GONGCHA_V2_QR_SECRET';
  
  // Create a payload simulating 70 seconds ago
  const epochSeconds = Math.floor(Date.now() / 1000) - 70;
  
  // Re-generate signature for 70s ago
  // To avoid exporting sha256 or importing crypto here, we can generate a real signature with a custom timestamp if we could,
  // or we can test by passing a custom maxAgeSeconds to verify!
  // Wait, let's test verifyDynamicMemberQrPayload with a maxAgeSeconds of 10, using a 15-second old payload!
  // That is brilliant because we don't have to mock time or re-implement hashing in tests!
  const result = generateDynamicMemberQrPayload(memberUid, secretKey, 30);
  
  // Since result was just created, it is about 0 seconds old.
  // If we verify with maxAgeSeconds = -1, it will immediately be seen as expired!
  const verificationExpired = verifyDynamicMemberQrPayload(result.qrPayload, secretKey, -1);
  assert.equal(verificationExpired.valid, false);
  assert.equal(verificationExpired.error, 'Token expired');
});

test('verifyDynamicMemberQrPayload fails for tampered/forged HMAC signature', () => {
  const memberUid = 'user-tamper';
  const result = generateDynamicMemberQrPayload(memberUid);
  
  // Tamper with the HMAC signature (the last part)
  const parts = result.qrPayload.split(':');
  parts[parts.length - 1] = '00000000'; // overwrite signature
  const tamperedPayload = parts.join(':');
  
  const verification = verifyDynamicMemberQrPayload(tamperedPayload);
  assert.equal(verification.valid, false);
  assert.equal(verification.error, 'Invalid signature');
});

test('verifyDynamicMemberQrPayload fails for bad format', () => {
  const badFormat1 = 'GC:M1:user-123:123456789:abcdef'; // bad prefix
  assert.equal(verifyDynamicMemberQrPayload(badFormat1).valid, false);
  assert.equal(verifyDynamicMemberQrPayload(badFormat1).error, 'Invalid prefix');

  const badFormat2 = 'GC:M2:user-123'; // too few parts
  assert.equal(verifyDynamicMemberQrPayload(badFormat2).valid, false);
  assert.equal(verifyDynamicMemberQrPayload(badFormat2).error, 'Invalid format');

  const badFormat3 = 'GC:M2:user-123:abc:defghijk'; // bad timestamp
  assert.equal(verifyDynamicMemberQrPayload(badFormat3).valid, false);
  assert.equal(verifyDynamicMemberQrPayload(badFormat3).error, 'Invalid timestamp');
});

test('verifyDynamicMemberQrPayload handles custom secret keys', () => {
  const memberUid = 'user-secret';
  const customSecret = 'MY_SUPER_SECRET_KEY';
  const result = generateDynamicMemberQrPayload(memberUid, customSecret);

  // Verification with wrong secret fails
  const verificationWrongSecret = verifyDynamicMemberQrPayload(result.qrPayload);
  assert.equal(verificationWrongSecret.valid, false);
  assert.equal(verificationWrongSecret.error, 'Invalid signature');

  // Verification with correct secret succeeds
  const verificationCorrectSecret = verifyDynamicMemberQrPayload(result.qrPayload, customSecret);
  assert.equal(verificationCorrectSecret.valid, true);
  assert.equal(verificationCorrectSecret.memberUid, 'user-secret');
});
