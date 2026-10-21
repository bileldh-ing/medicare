/**
 * Password hashing helpers. Pure functions over an injectable CryptoProvider so the
 * same code runs on device (expo-crypto) and in Jest (node:crypto).
 */
export interface CryptoProvider {
  randomBytes(count: number): Uint8Array;
  sha256Hex(data: string): Promise<string>;
}

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

/** 16 random bytes as hex, unique per user. */
export function generateSalt(crypto: CryptoProvider): string {
  return toHex(crypto.randomBytes(16));
}

/** 32 random bytes as hex. */
export function generateToken(crypto: CryptoProvider): string {
  return toHex(crypto.randomBytes(32));
}

/** Salted SHA-256: sha256(salt + ':' + password). Never store the plain password. */
export function hashPassword(
  password: string,
  salt: string,
  crypto: CryptoProvider,
): Promise<string> {
  return crypto.sha256Hex(`${salt}:${password}`);
}

/** Compares two strings in time independent of where they first differ. */
export function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
