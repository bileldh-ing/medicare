import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Illustration } from '@/components/ui/Illustrations';
import { useTheme } from '@/theme';

/** Friendly crash screen used as Expo Router's ErrorBoundary for every route. */
export function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: t.colors.background }]}>
      <View style={styles.body}>
        <Illustration name="heart" size={150} />
        <AppText variant="hero" style={styles.center} accessibilityRole="header">
          Something went wrong
        </AppText>
        <AppText color="secondary" style={[styles.center, styles.message]}>
          Your data is safe on this device. Try again, and if it keeps happening restart the app.
        </AppText>
        {__DEV__ ? (
          <AppText variant="small" color="muted" style={styles.center} numberOfLines={4}>
            {error.message}
          </AppText>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button title="Try again" icon="refresh-cw" onPress={() => void retry()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  center: { textAlign: 'center' },
  message: { marginBottom: 8 },
  actions: { padding: 20 },
});
