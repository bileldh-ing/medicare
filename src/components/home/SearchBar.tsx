import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { CircleButton } from '@/components/ui/CircleButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { useIsReducedMotion } from '@/utils/motion';

interface Props {
  onPress: () => void;
}

const LISTEN_MS = 2400;

/** Home search pill (opens the search screen) + mic button with pulsing ripple. */
export function SearchBar({ onPress }: Props) {
  const t = useTheme();
  const reduced = useIsReducedMotion();
  const [listening, setListening] = useState(false);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!listening) {
      cancelAnimation(pulse);
      pulse.set(0);
      return;
    }
    if (!reduced) {
      pulse.set(withRepeat(withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }), -1));
    }
    const timer = setTimeout(() => setListening(false), LISTEN_MS);
    return () => clearTimeout(timer);
  }, [listening, reduced, pulse]);

  const ripple = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.9 }],
  }));

  return (
    <View style={styles.row}>
      <PressableScale
        onPress={onPress}
        haptic={false}
        style={[
          styles.pill,
          { backgroundColor: t.colors.surface, borderRadius: t.radii.input },
          t.shadows.card,
        ]}
        accessibilityRole="search"
        accessibilityLabel="Search a doctor, medicines, etc."
        accessibilityHint="Opens search"
      >
        <Feather name="search" size={22} color={t.colors.textPrimary} />
        <AppText color="muted" numberOfLines={1} style={styles.placeholder}>
          Search a doctor, medicines, etc...
        </AppText>
      </PressableScale>
      <View>
        {listening ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.ripple, { backgroundColor: t.colors.primary }, ripple]}
          />
        ) : null}
        <CircleButton
          icon="mic"
          color={listening ? t.colors.primary : t.colors.textPrimary}
          accessibilityLabel={listening ? 'Listening' : 'Voice search'}
          onPress={() => {
            haptics.medium();
            setListening(true);
          }}
          size={56}
        />
        {listening ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(150)}
            style={[styles.tooltip, { backgroundColor: t.colors.textPrimary }]}
            accessibilityLiveRegion="polite"
          >
            <AppText variant="caption" style={{ color: t.colors.background }}>
              Voice search coming soon
            </AppText>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholder: { marginLeft: 12, flex: 1 },
  ripple: { position: 'absolute', width: 56, height: 56, borderRadius: 28 },
  tooltip: {
    position: 'absolute',
    top: 64,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    width: 180,
    zIndex: 10,
  },
});
