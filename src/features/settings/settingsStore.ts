import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/app';
import { createPersistStorage } from '@/utils/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface SettingsData {
  haptics: boolean;
  notifications: boolean;
  reducedMotion: boolean;
  onboardingSeen: boolean;
  themeMode: ThemeMode;
}

interface SettingsState extends SettingsData {
  hasHydrated: boolean;
  setSetting: <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => void;
  setHasHydrated: (v: boolean) => void;
}

export const DEFAULT_SETTINGS: SettingsData = {
  haptics: true,
  notifications: true,
  reducedMotion: false,
  onboardingSeen: false,
  themeMode: 'system',
};

const SETTINGS_VERSION = 2;

/** v1 had no theme mode and stored `hapticsEnabled`. */
export function migrateSettings(persisted: unknown, version: number): SettingsData {
  const p = (persisted && typeof persisted === 'object' ? persisted : {}) as Record<
    string,
    unknown
  >;
  if (version < 2) {
    return {
      ...DEFAULT_SETTINGS,
      haptics: typeof p.hapticsEnabled === 'boolean' ? p.hapticsEnabled : DEFAULT_SETTINGS.haptics,
      notifications:
        typeof p.notifications === 'boolean' ? p.notifications : DEFAULT_SETTINGS.notifications,
      reducedMotion:
        typeof p.reducedMotion === 'boolean' ? p.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
      onboardingSeen: p.onboardingSeen === true,
    };
  }
  return { ...DEFAULT_SETTINGS, ...(p as Partial<SettingsData>) };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      hasHydrated: false,
      setSetting: (key, value) => set({ [key]: value } as Pick<SettingsData, typeof key>),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: SETTINGS_VERSION,
      storage: createPersistStorage<SettingsData>(),
      migrate: (persisted, version) => migrateSettings(persisted, version),
      partialize: (s): SettingsData => ({
        haptics: s.haptics,
        notifications: s.notifications,
        reducedMotion: s.reducedMotion,
        onboardingSeen: s.onboardingSeen,
        themeMode: s.themeMode,
      }),
      onRehydrateStorage: () => (state) => {
        // Runs even when storage was empty/corrupted, so the splash never hangs.
        (state ?? useSettingsStore.getState()).setHasHydrated(true);
      },
    },
  ),
);
