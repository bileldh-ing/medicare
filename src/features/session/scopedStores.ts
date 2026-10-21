import {
  flushPendingWrites,
  setActiveUserId,
  suspendScopedWrites,
  getActiveUserId,
} from '@/utils/storage';

interface ScopedStoreHandle {
  name: string;
  /** Replace data with the empty initial data (no write happens while switching). */
  reset: () => void;
  /** Re-read the persisted data for the active user. */
  rehydrate: () => Promise<void> | void;
}

const registry: ScopedStoreHandle[] = [];

/** Each per-user zustand store registers itself here at module load. */
export function registerScopedStore(handle: ScopedStoreHandle) {
  if (!registry.some((h) => h.name === handle.name)) registry.push(handle);
}

/**
 * Points every per-user store at `userId` (or at nobody on sign-out):
 * flush pending writes for the previous user, reset in-memory data without
 * writing it anywhere, then rehydrate from the new user's namespace.
 */
export async function switchActiveUser(userId: string | null): Promise<void> {
  if (getActiveUserId() === userId && userId !== null) return;
  await flushPendingWrites();
  suspendScopedWrites(true);
  setActiveUserId(userId);
  registry.forEach((h) => h.reset());
  suspendScopedWrites(false);
  if (userId) {
    await Promise.all(registry.map((h) => h.rehydrate()));
  }
}
