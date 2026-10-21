import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/app';
import { registerScopedStore } from '@/features/session/scopedStores';
import { createUserScopedStorage } from '@/utils/storage';

interface BookmarksData {
  ids: string[];
}

interface BookmarksState extends BookmarksData {
  hasHydrated: boolean;
  toggle: (doctorId: string) => boolean;
}

const EMPTY: BookmarksData = { ids: [] };

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      hasHydrated: false,
      /** Returns the new bookmarked state. */
      toggle: (doctorId) => {
        const has = get().ids.includes(doctorId);
        set({ ids: has ? get().ids.filter((x) => x !== doctorId) : [...get().ids, doctorId] });
        return !has;
      },
    }),
    {
      name: STORAGE_KEYS.bookmarks,
      version: 1,
      storage: createUserScopedStorage<BookmarksData>(),
      skipHydration: true,
      partialize: (s): BookmarksData => ({ ids: s.ids }),
      migrate: (p) => {
        const ids = (p as Partial<BookmarksData> | undefined)?.ids;
        return { ids: Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [] };
      },
      onRehydrateStorage: () => () => useBookmarksStore.setState({ hasHydrated: true }),
    },
  ),
);

registerScopedStore({
  name: 'bookmarks',
  reset: () => useBookmarksStore.setState({ ...EMPTY, hasHydrated: false }),
  rehydrate: () => useBookmarksStore.persist.rehydrate(),
});
