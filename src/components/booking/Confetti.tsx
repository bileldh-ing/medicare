import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { mulberry32 } from '@/features/appointments/slots';

const COLORS = ['#4C7AD5', '#22C55E', '#F5B301', '#EF4444', '#8FB0F0', '#A78BFA'];
const COUNT = 22;

interface Particle {
  angle: number;
  distance: number;
  size: number;
  color: string;
  spin: number;
  round: boolean;
}

/** Lightweight confetti burst: 22 UI-thread particles, ~900 ms. */
export const Confetti = memo(function Confetti({ burstKey }: { burstKey: number }) {
  const progress = useSharedValue(0);
  const particles = useMemo<Particle[]>(() => {
    // Seeded PRNG keeps render pure while every burst still looks different.
    const rand = mulberry32(burstKey * 7919 + 17);
    return Array.from({ length: COUNT }, (_, i) => ({
      angle: (Math.PI * 2 * i) / COUNT + (rand() - 0.5) * 0.5,
      distance: 70 + rand() * 70,
      size: 6 + rand() * 5,
      color: COLORS[i % COLORS.length] ?? '#4C7AD5',
      spin: (rand() - 0.5) * 720,
      round: i % 3 === 0,
    }));
  }, [burstKey]);

  useEffect(() => {
    if (burstKey === 0) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
  }, [burstKey, progress]);

  if (burstKey === 0) return null;
  return (
    <View pointerEvents="none" style={styles.center}>
      {particles.map((p, i) => (
        <Piece key={i} p={p} progress={progress} />
      ))}
    </View>
  );
});

function Piece({ p, progress }: { p: Particle; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const v = progress.get();
    const gravity = 60 * v * v;
    return {
      opacity: v < 0.8 ? 1 : (1 - v) * 5,
      transform: [
        { translateX: Math.cos(p.angle) * p.distance * v },
        { translateY: Math.sin(p.angle) * p.distance * v + gravity },
        { rotate: `${p.spin * v}deg` },
        { scale: v === 0 ? 0 : 1 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: p.size,
          height: p.round ? p.size : p.size * 0.5,
          backgroundColor: p.color,
          borderRadius: p.round ? p.size : 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  piece: { position: 'absolute' },
});
