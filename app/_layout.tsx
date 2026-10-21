import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Asset } from 'expo-asset';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorFallback } from '@/components/common/ErrorFallback';
import { ToastHost } from '@/components/ui/Toast';
import { useAuthStore } from '@/features/auth/authStore';
import { DOCTORS } from '@/features/doctors/doctors';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useTheme } from '@/theme';
import { flushPendingWrites } from '@/utils/storage';

/** Route-level crash screen (Expo Router picks up this named export). */
export const ErrorBoundary = ErrorFallback;

// Keep the native splash up until fonts, persisted stores and the session are ready.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Warm the first doctor photos so Home renders without pop-in. */
async function prefetchImages() {
  const modules = DOCTORS.slice(0, 4)
    .map((d) => d.avatarImage)
    .filter((m): m is number => typeof m === 'number');
  await Promise.race([
    Asset.loadAsync(modules).catch(() => undefined),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const settingsHydrated = useSettingsStore((s) => s.hasHydrated);
  const authHydrated = useAuthStore((s) => s.hasHydrated);
  const status = useAuthStore((s) => s.status);
  const [assetsReady, setAssetsReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    useAuthStore.getState().bootstrap();
    prefetchImages().finally(() => setAssetsReady(true));
    // Safety net: never keep the splash forever if storage misbehaves.
    const id = setTimeout(() => setTimedOut(true), 6000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') flushPendingWrites();
    });
    return () => {
      clearTimeout(id);
      sub.remove();
    };
  }, []);

  const ready =
    (fontsLoaded || !!fontError || timedOut) &&
    (settingsHydrated || timedOut) &&
    authHydrated &&
    (assetsReady || timedOut);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  const navTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        primary: theme.colors.primary,
        text: theme.colors.textPrimary,
        border: theme.colors.divider,
      },
    };
  }, [theme]);

  if (!ready) return null;

  const signedIn = status === 'signedIn';

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style={theme.isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background },
              animation: 'fade',
            }}
          >
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Protected guard={signedIn}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
          </Stack>
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
