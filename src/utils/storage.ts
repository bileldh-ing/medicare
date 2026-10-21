import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistStorage, StorageValue } from 'zustand/middleware';

/** Minimal async key/value contract (AsyncStorage-compatible, easy to fake in tests). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const asyncStorage: KeyValueStorage = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
};

/** Parses JSON without ever throwing: corrupted storage falls back to `fallback`. */
export function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/** Typed JSON helpers on top of a KeyValueStorage, all corruption-safe. */
export function createJsonStore(kv: KeyValueStorage = asyncStorage) {
  return {
    async get<T>(key: string, fallback: T, validate?: (v: unknown) => v is T): Promise<T> {
      let raw: string | null = null;
      try {
        raw = await kv.getItem(key);
      } catch {
        return fallback;
      }
      const value = safeParse<unknown>(raw, fallback);
      if (validate && !validate(value)) return fallback;
      return value as T;
    },
    async set<T>(key: string, value: T): Promise<void> {
      await kv.setItem(key, JSON.stringify(value));
    },
    async remove(key: string): Promise<void> {
      try {
        await kv.removeItem(key);
      } catch {
        // ignore: nothing to remove
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* zustand persist adapters                                           */
/* ------------------------------------------------------------------ */

const pendingWrites = new Map<string, { value: string; timer: ReturnType<typeof setTimeout> }>();
const WRITE_DEBOUNCE_MS = 250;

/** Writes every pending debounced value immediately (call before switching user / app background). */
export async function flushPendingWrites(kv: KeyValueStorage = asyncStorage): Promise<void> {
  const entries = [...pendingWrites.entries()];
  pendingWrites.clear();
  await Promise.all(
    entries.map(([key, { value, timer }]) => {
      clearTimeout(timer);
      return kv.setItem(key, value).catch(() => undefined);
    }),
  );
}

function scheduleWrite(kv: KeyValueStorage, key: string, value: string) {
  const prev = pendingWrites.get(key);
  if (prev) clearTimeout(prev.timer);
  const timer = setTimeout(() => {
    pendingWrites.delete(key);
    kv.setItem(key, value).catch(() => undefined);
  }, WRITE_DEBOUNCE_MS);
  pendingWrites.set(key, { value, timer });
}

/**
 * Persist storage for zustand: corruption-safe reads and batched (debounced) writes,
 * so rapid state changes never hammer AsyncStorage.
 */
export function createPersistStorage<S>(kv: KeyValueStorage = asyncStorage): PersistStorage<S> {
  return {
    getItem: async (name) => {
      try {
        const pending = pendingWrites.get(name);
        const raw = pending ? pending.value : await kv.getItem(name);
        return safeParse<StorageValue<S> | null>(raw, null);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      scheduleWrite(kv, name, JSON.stringify(value));
    },
    removeItem: async (name) => {
      pendingWrites.delete(name);
      await kv.removeItem(name).catch(() => undefined);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Per-user namespacing                                               */
/* ------------------------------------------------------------------ */

let activeUserId: string | null = null;
let writesSuspended = false;

export function getActiveUserId(): string | null {
  return activeUserId;
}

export function setActiveUserId(id: string | null) {
  activeUserId = id;
}

export function suspendScopedWrites(suspended: boolean) {
  writesSuspended = suspended;
}

export function scopedKey(base: string, userId: string): string {
  return `${base}/${userId}`;
}

/**
 * Persist storage whose real key is `${name}/${activeUserId}`. With no active user,
 * reads return nothing and writes are dropped, so one account can never see or
 * overwrite another account's data.
 */
export function createUserScopedStorage<S>(kv: KeyValueStorage = asyncStorage): PersistStorage<S> {
  const inner = createPersistStorage<S>(kv);
  return {
    getItem: (name) => (activeUserId ? inner.getItem(scopedKey(name, activeUserId)) : null),
    setItem: (name, value) => {
      if (!activeUserId || writesSuspended) return;
      return inner.setItem(scopedKey(name, activeUserId), value);
    },
    removeItem: (name) => {
      if (!activeUserId) return;
      return inner.removeItem(scopedKey(name, activeUserId));
    },
  };
}
