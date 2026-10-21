import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { passwordStrength } from '@/features/auth/schemas';
import { useTheme } from '@/theme';

const LABELS = { empty: '', weak: 'Weak', medium: 'Medium', strong: 'Strong' } as const;

/** Password strength bar that fills and changes colour smoothly. */
export function StrengthMeter({ password }: { password: string }) {
  const t = useTheme();
  const { score, label } = passwordStrength(password);
  const v = useSharedValue(0);

  useEffect(() => {
    v.set(withTiming(score, { duration: 350 }));
  }, [score, v]);

  const bar = useAnimatedStyle(() => ({
    width: `${v.get() * 100}%`,
    backgroundColor: interpolateColor(
      v.get(),
      [0, 0.4, 0.6, 1],
      ['#EF4444', '#EF4444', '#F5B301', '#22C55E'],
    ),
  }));

  if (!password) return null;
  return (
    <View style={styles.wrap} accessibilityLabel={`Password strength: ${LABELS[label]}`} accessible>
      <View style={[styles.track, { backgroundColor: t.colors.divider }]}>
        <Animated.View style={[styles.fill, bar]} />
      </View>
      <AppText variant="caption" color="secondary" style={styles.label}>
        {LABELS[label]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', marginTop: -6, paddingHorizontal: 18 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  label: { width: 64, textAlign: 'right' },
});
