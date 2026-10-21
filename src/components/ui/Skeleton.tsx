import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { useIsReducedMotion } from '@/utils/motion';

interface Props {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Shimmer placeholder used while images and lists load. */
export function Skeleton({ width = '100%', height = 16, radius = 10, style }: Props) {
  const { colors } = useTheme();
  const reduced = useIsReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(-1);

  useEffect(() => {
    if (reduced) return;
    x.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }), -1));
    return () => cancelAnimation(x);
  }, [reduced, x]);

  const shimmer = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * w }] }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.skeleton,
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {!reduced && w > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, shimmer]}>
          <LinearGradient
            colors={['transparent', colors.skeletonHighlight, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Placeholder shaped like a doctor list card. */
export function DoctorCardSkeleton() {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderRadius: t.radii.card }]}>
      <Skeleton width={96} height={96} radius={20} />
      <View style={styles.lines}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="45%" height={14} />
        <Skeleton width="55%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', padding: 12, marginBottom: 12, gap: 14, alignItems: 'center' },
  lines: { flex: 1, gap: 10 },
});
