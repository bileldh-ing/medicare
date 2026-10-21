import { createHash, randomBytes } from 'crypto';

import type { SecureStorage } from '@/features/auth/authService';
import type { CryptoProvider } from '@/features/auth/hash';
import type { KeyValueStorage } from '@/utils/storage';

/** In-memory AsyncStorage stand-in. `data` is exposed for assertions. */
export function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
  };
}

export function memorySecure(): SecureStorage & { data: Map<string, string> } {
  return memoryStorage();
}

/** node:crypto implementation of the provider used on device by expo-crypto. */
export const nodeCrypto: CryptoProvider = {
  randomBytes: (n) => new Uint8Array(randomBytes(n)),
  sha256Hex: async (s) => createHash('sha256').update(s).digest('hex'),
};

/** A controllable clock. */
export function clock(start = new Date(2025, 10, 24, 9, 0).getTime()) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}
