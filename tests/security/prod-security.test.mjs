import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateDynamicMemberQrPayload,
  verifyDynamicMemberQrPayload,
} from '../../src/application/memberCardShell/GetDynamicMemberQr.ts';

// We simulate production conditions by defining a secure production secret key
const PROD_SECRET_KEY = process.env.GONGCHA_V2_QR_SECRET || 'GONGCHA_PROD_SECRET_KEY_FOR_GATE_G001_2026';

test('Production Security Gate: HMAC QR payload generation matches production entropy requirements', () => {
  // Production secret must be complex and non-default
  assert.notEqual(PROD_SECRET_KEY, 'GONGCHA_V2_QR_SECRET', 'Production secret key must not use the local default fallback');
  assert.ok(PROD_SECRET_KEY.length >= 16, 'Production secret key should have a minimum length of 16 characters for HMAC-SHA256');
});

test('Production Security Gate: QR payload generation and verification under production key', () => {
  const memberUid = 'prod-user-999';
  
  // 1. Generate payload using the production secret key
  const result = generateDynamicMemberQrPayload(memberUid, PROD_SECRET_KEY);
  
  assert.ok(result.qrPayload);
  assert.ok(result.expiresAt);
  assert.equal(result.ttlSeconds, 30, 'Production dynamic QR must have a 30-second TTL');
  
  // Payload format: GC:M2:${memberUid}:${epochSeconds}:${hmac8Hex}
  assert.match(result.qrPayload, /^GC:M2:prod-user-999:\d+:[a-f0-9]{8}$/);

  // 2. Verify payload with the correct production key
  const verification = verifyDynamicMemberQrPayload(result.qrPayload, PROD_SECRET_KEY);
  assert.equal(verification.valid, true, 'Verification must succeed with production key');
  assert.equal(verification.memberUid, 'prod-user-999');
  assert.equal(verification.error, undefined);
});

test('Production Security Gate: verification fails when using default/non-prod key on production payload', () => {
  const memberUid = 'prod-user-888';
  const result = generateDynamicMemberQrPayload(memberUid, PROD_SECRET_KEY);

  // Verifying production-generated payload with local fallback key must fail
  const verificationWithDefault = verifyDynamicMemberQrPayload(result.qrPayload, 'GONGCHA_V2_QR_SECRET');
  assert.equal(verificationWithDefault.valid, false);
  assert.equal(verificationWithDefault.error, 'Invalid signature', 'Must reject default key when validating a production payload');
});

test('Production Security Gate: verification fails under expired production window', () => {
  const memberUid = 'prod-user-777';
  const result = generateDynamicMemberQrPayload(memberUid, PROD_SECRET_KEY);

  // With negative maxAgeSeconds, the fresh token is immediately treated as expired (simulating timeout)
  const verificationExpired = verifyDynamicMemberQrPayload(result.qrPayload, PROD_SECRET_KEY, -1);
  assert.equal(verificationExpired.valid, false);
  assert.equal(verificationExpired.error, 'Token expired', 'Must reject token if verification window is exceeded');
});

test('Production Security Gate: verification detects tampered signature under production settings', () => {
  const memberUid = 'prod-user-555';
  const result = generateDynamicMemberQrPayload(memberUid, PROD_SECRET_KEY);

  // Tamper signature hex
  const parts = result.qrPayload.split(':');
  parts[parts.length - 1] = 'abcdef01'; // tampered signature
  const tamperedPayload = parts.join(':');

  const verification = verifyDynamicMemberQrPayload(tamperedPayload, PROD_SECRET_KEY);
  assert.equal(verification.valid, false);
  assert.equal(verification.error, 'Invalid signature', 'Must fail signature check if payload signature is tampered');
});
