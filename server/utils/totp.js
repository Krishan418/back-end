import crypto from 'crypto';

const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Decodes a base32 string into a buffer of bytes
function base32Decode(str) {
  const cleaned = str.replace(/\s+/g, '').replace(/=+$/, '').toUpperCase();
  let val = 0;
  let count = 0;
  const bytes = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = base32chars.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error('Invalid base32 character: ' + cleaned[i]);
    }
    val = (val << 5) | idx;
    count += 5;
    if (count >= 8) {
      bytes.push((val >>> (count - 8)) & 255);
      count -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generates a random 16-character base32 secret key.
 */
export function generateSecret() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  // Generate random bytes and map to base32
  const randomBytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Generates the 6-digit TOTP token for a given base32 secret and timestamp.
 * Defaults to current time step (30 seconds window).
 */
export function generateTOTP(secret, time = Date.now()) {
  const key = base32Decode(secret);
  // Time step count (30 second intervals)
  const epoch = Math.floor(time / 1000 / 30);
  
  // Write counter as 8-byte big-endian integer
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(epoch / 0x100000000), 0);
  counter.writeUInt32BE(epoch & 0xffffffff, 4);

  // HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counter);
  const hmacResult = hmac.digest();

  // Dynamic truncation
  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const binary =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  // Get a 6-digit code
  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code against a base32 secret.
 * Allows a clock drift window of 1 step before/after (i.e. +/- 30 seconds).
 */
export function verifyTOTP(secret, code) {
  if (!code || code.length !== 6 || isNaN(code)) {
    return false;
  }

  const now = Date.now();
  // Check current time step, previous, and next to accommodate small network or clock delays
  const steps = [0, -1, 1];
  
  for (const step of steps) {
    const timeStep = now + (step * 30 * 1000);
    const expected = generateTOTP(secret, timeStep);
    if (expected === code) {
      return true;
    }
  }

  return false;
}
