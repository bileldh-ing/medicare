import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

type ToastKind = 'info' | 'success' | 'error';

interface ToastState {
  id: number;
  message: string | null;
  kind: ToastKind;
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
}

const useToastStore = create<ToastState>()((set, get) => ({
  id: 0,
  message: null,
  kind: 'info',
  show: (message, kind = 'info') => set({ message, kind, id: get().id + 1 }),
  hide: () => set({ message: null }),
}));

/** Imperative toast API usable from anywhere (screens, handlers). */
export const toast = {
  show: (m: string) => useToastStore.getState().show(m, 'info'),
  success: (m: string) => useToastStore.getState().show(m, 'success'),
  error: (m: string) => useToastStore.getState().show(m, 'error'),
};

const ICONS = { info: 'info', success: 'check-circle', error: 'alert-circle' } as const;

/** Mounted once in the root layout. */
export function ToastHost() {
  const { id, message, kind, hide } = useToastStore();
  const t = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, 2600);
    return () => clearTimeout(timer);
  }, [id, message, hide]);

  if (!message) return null;
  const color =
    kind === 'error' ? t.colors.error : kind === 'success' ? t.colors.success : t.colors.primary;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      <Animated.View
        key={id}
        entering={FadeInUp.springify().damping(18)}
        exiting={FadeOutUp.duration(160)}
        style={[styles.toast, { backgroundColor: t.colors.surface }, t.shadows.strong]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Feather name={ICONS[kind]} size={20} color={color} />
        <AppText variant="bodyMedium" style={styles.text}>
          {message}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: 520,
  },
  text: { flexShrink: 1 },
});
