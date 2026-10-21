import { useLayoutEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Appointment } from '@/features/appointments/bookingRules';
import { getDoctor } from '@/features/doctors/doctors';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { springs, useIsReducedMotion } from '@/utils/motion';

import { AppointmentCard } from './AppointmentCard';

interface Props {
  appointments: Appointment[];
  onReschedule: (a: Appointment) => void;
  onViewProfile: (a: Appointment) => void;
  onVideo: (a: Appointment) => void;
}

const PEEK = 14;

/**
 * Stacked appointment cards: the next card peeks behind the top edge; swiping
 * the top card flings it away while the next one scales up into place.
 */
export function AppointmentStack({ appointments, onReschedule, onViewProfile, onVideo }: Props) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const reduced = useIsReducedMotion();
  const [index, setIndex] = useState(0);
  const x = useSharedValue(0);
  const count = appointments.length;
  const safeIndex = count ? index % count : 0;
  const current = appointments[safeIndex];
  const next = count > 1 ? appointments[(safeIndex + 1) % count] : undefined;

  useLayoutEffect(() => {
    x.set(0);
  }, [safeIndex, x]);

  const advance = (dir: number) => {
    haptics.selection();
    setIndex((i) => (dir > 0 ? (i - 1 + count) % count : (i + 1) % count));
  };

  const pan = Gesture.Pan()
    .enabled(count > 1)
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onChange((e) => {
      x.set(x.get() + e.changeX);
    })
    .onEnd((e) => {
      const cur = x.get();
      const shouldFling = Math.abs(cur) > width * 0.28 || Math.abs(e.velocityX) > 800;
      if (shouldFling) {
        const dir = cur === 0 ? Math.sign(e.velocityX) : Math.sign(cur);
        x.set(
          withTiming(dir * width * 1.3, { duration: reduced ? 1 : 220 }, (done) => {
            if (done) scheduleOnRN(advance, dir);
          }),
        );
      } else {
        x.set(withSpring(0, springs.gentle));
      }
    });

  const topStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { rotate: `${interpolate(x.get(), [-width, width], [-8, 8], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => {
    const p = interpolate(Math.abs(x.get()), [0, width * 0.6], [0, 1], Extrapolation.CLAMP);
    return {
      // Narrower and lifted so ~12px peeks above the top card, like the reference.
      transform: [
        { translateY: -PEEK * (1 - p) },
        { scaleX: 0.9 + 0.1 * p },
        { scaleY: 0.98 + 0.02 * p },
      ],
    };
  });
  const backTint = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(x.get()), [0, width * 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  if (!current) return null;
  const doctor = getDoctor(current.doctorId);
  const nextDoctor = next ? getDoctor(next.doctorId) : undefined;
  if (!doctor) return null;

  return (
    <View
      style={styles.wrap}
      accessibilityHint={count > 1 ? 'Swipe left or right for more appointments' : undefined}
    >
      <View>
        {/* Back layer: the next appointment (or a decorative card) peeking above the top edge. */}
        <Animated.View
          style={[styles.back, backStyle]}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        >
          {next && nextDoctor ? <AppointmentCard appointment={next} doctor={nextDoctor} /> : null}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: t.colors.blueTintBorder, borderRadius: t.radii.card },
              next ? backTint : null,
            ]}
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View style={topStyle}>
            <AppointmentCard
              appointment={current}
              doctor={doctor}
              onReschedule={() => onReschedule(current)}
              onSecondary={() => onViewProfile(current)}
              onVideo={() => onVideo(current)}
            />
          </Animated.View>
        </GestureDetector>
      </View>
      {count > 1 ? (
        <View style={styles.dots} accessibilityLabel={`Appointment ${safeIndex + 1} of ${count}`}>
          {appointments.map((a, i) => (
            <View
              key={a.id}
              style={[
                styles.dot,
                {
                  backgroundColor: i === safeIndex ? t.colors.primary : t.colors.blueTintBorder,
                  width: i === safeIndex ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: PEEK },
  back: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { height: 6, borderRadius: 3 },
});
