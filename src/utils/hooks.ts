import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_BOTTOM, TAB_BAR_HEIGHT } from '@/components/nav/FloatingTabBar';
import { useAppointmentsStore } from '@/features/appointments/appointmentsStore';

/** Current time, refreshed every minute and when the app returns to the foreground. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(new Date());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);
  return now;
}

/** Keeps appointment statuses fresh: ended "upcoming" ones move to "past". */
export function useAutoPastStatuses(now: Date) {
  const refresh = useAppointmentsStore((s) => s.refreshStatuses);
  const hydrated = useAppointmentsStore((s) => s.hasHydrated);
  useEffect(() => {
    if (hydrated) refresh(now);
  }, [now, hydrated, refresh]);
}

/** Bottom padding so content clears the floating tab bar. */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + insets.bottom + 24;
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
