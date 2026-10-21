import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/app';
import { registerScopedStore } from '@/features/session/scopedStores';
import { createUserScopedStorage } from '@/utils/storage';

interface RecentData {
  items: string[];
}

interface RecentState extends RecentData {
  hasHydrated: boolean;
  /** Called on submit / result tap only (never per keystroke). */
  add: (q: string) => void;
  remove: (q: string) => void;
  clear: () => void;
}

const MAX = 8;
const EMPTY: RecentData = { items: [] };

export const useRecentSearchesStore = create<RecentState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      hasHydrated: false,
      add: (q) => {
        const v = q.trim();
        if (v.length < 2) return;
        const rest = get().items.filter((x) => x.toLowerCase() !== v.toLowerCase());
        set({ items: [v, ...rest].slice(0, MAX) });
      },
      remove: (q) => set({ items: get().items.filter((x) => x !== q) }),
      clear: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEYS.recentSearches,
      version: 1,
      storage: createUserScopedStorage<RecentData>(),
      skipHydration: true,
      partialize: (s): RecentData => ({ items: s.items }),
      migrate: (p) => {
        const items = (p as Partial<RecentData> | undefined)?.items;
        return { items: Array.isArray(items) ? items.filter((x) => typeof x === 'string') : [] };
      },
      onRehydrateStorage: () => () => useRecentSearchesStore.setState({ hasHydrated: true }),
    },
  ),
);

registerScopedStore({
  name: 'recentSearches',
  reset: () => useRecentSearchesStore.setState({ ...EMPTY, hasHydrated: false }),
  rehydrate: () => useRecentSearchesStore.persist.rehydrate(),
});
