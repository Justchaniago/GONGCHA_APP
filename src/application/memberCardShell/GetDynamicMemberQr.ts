// Pure JS SHA-256 implementation to avoid React Native/Expo runtime dependency on Node's 'crypto'
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j; // Generic indices

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isPrime = (n: number) => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (isPrime(candidate)) {
      if (primeCounter < 8) {
        hash[primeCounter] = ((mathPow(candidate, 0.5) % 1) * maxWord) | 0;
      }
      k[primeCounter] = ((mathPow(candidate, 1 / 3) % 1) * maxWord) | 0;
      primeCounter++;
    }
  }

  ascii += '\x80'; // Append '1' bit and seven '0' bits
  while ((ascii[lengthProperty] % 64) - 56) {
    ascii += '\x00'; // Padding
  }

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII fallback
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiLength * 8) / maxWord) | 0;
  words[words[lengthProperty]] = (asciiLength * 8) | 0;

  let [a, b, c, d, e, f, g, h] = hash;

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const [oldA, oldB, oldC, oldD, oldE, oldF, oldG, oldH] = [a, b, c, d, e, f, g, h];

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = w[j] || 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    a = (a + oldA) | 0;
    b = (b + oldB) | 0;
    c = (c + oldC) | 0;
    d = (d + oldD) | 0;
    e = (e + oldE) | 0;
    f = (f + oldF) | 0;
    g = (g + oldG) | 0;
    h = (h + oldH) | 0;
  }

  return [a, b, c, d, e, f, g, h]
    .map((num) => {
      const hex = (num >>> 0).toString(16);
      return hex.padStart(8, '0');
    })
    .join('');
}

export function generateDynamicMemberQrPayload(
  memberUid: string,
  secretKey = 'GONGCHA_V2_QR_SECRET',
  windowSeconds = 30
): { qrPayload: string; expiresAt: number; ttlSeconds: number } {
  const epochSeconds = Math.floor(Date.now() / 1000);
  const message = `GC:M2:${memberUid}:${epochSeconds}`;
  
  // pseudo-HMAC signature of the message using the secret key
  const signature = sha256(`${secretKey}:${message}`);
  const hmac8Hex = signature.slice(0, 8);
  const qrPayload = `GC:M2:${memberUid}:${epochSeconds}:${hmac8Hex}`;

  return {
    qrPayload,
    expiresAt: epochSeconds + windowSeconds,
    ttlSeconds: windowSeconds,
  };
}

export function verifyDynamicMemberQrPayload(
  payload: string,
  secretKey = 'GONGCHA_V2_QR_SECRET',
  maxAgeSeconds = 60
): { valid: boolean; memberUid?: string; error?: string } {
  if (!payload.startsWith('GC:M2:')) {
    return { valid: false, error: 'Invalid prefix' };
  }

  const parts = payload.split(':');
  if (parts.length < 5) {
    return { valid: false, error: 'Invalid format' };
  }

  const hmac8Hex = parts[parts.length - 1];
  const epochSecondsStr = parts[parts.length - 2];
  const memberUid = parts.slice(2, parts.length - 2).join(':');

  const epochSeconds = parseInt(epochSecondsStr, 10);
  if (isNaN(epochSeconds)) {
    return { valid: false, error: 'Invalid timestamp' };
  }

  const currentEpoch = Math.floor(Date.now() / 1000);
  const ageSeconds = currentEpoch - epochSeconds;

  if (ageSeconds > maxAgeSeconds) {
    return { valid: false, error: 'Token expired' };
  }
  if (ageSeconds < -5) {
    return { valid: false, error: 'Token from future' };
  }

  const expectedMessage = `GC:M2:${memberUid}:${epochSeconds}`;
  const expectedSignature = sha256(`${secretKey}:${expectedMessage}`);
  const expectedHmac8Hex = expectedSignature.slice(0, 8);

  if (hmac8Hex !== expectedHmac8Hex) {
    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: true, memberUid };
}
