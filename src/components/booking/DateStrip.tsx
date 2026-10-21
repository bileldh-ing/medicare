import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';
import { isDayDisabled } from '@/features/appointments/bookingRules';
import { WEEKDAYS_SHORT, formatDateLabel, isSameDay } from '@/features/appointments/dateUtils';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { springs, useIsReducedMotion } from '@/utils/motion';

interface Props {
  days: Date[];
  selected: Date;
  now: Date;
  onSelect: (d: Date) => void;
  /** -1 previous week, +1 next week */
  onSwipeWeek: (dir: -1 | 1) => void;
  canGoBack: boolean;
}

/** Sun..Sat row of tall pills; swipe horizontally to change week. */
export function DateStrip({ days, selected, now, onSelect, onSwipeWeek, canGoBack }: Props) {
  const x = useSharedValue(0);
  const reduced = useIsReducedMotion();
  const weekKey = days[0]?.toDateString() ?? '';

  useEffect(() => {
    // New week arrived: slide it in from the side it came from.
    x.set(withSpring(0, springs.gentle));
  }, [weekKey, x]);

  const go = (dir: -1 | 1) => {
    haptics.selection();
    onSwipeWeek(dir);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onChange((e) => {
      const cur = x.get();
      const blockedBack = !canGoBack && cur + e.changeX > 0;
      x.set(cur + (blockedBack ? e.changeX * 0.25 : e.changeX));
    })
    .onEnd((e) => {
      const dx = x.get();
      const forward = dx < -50 || e.velocityX < -600;
      const backward = (dx > 50 || e.velocityX > 600) && canGoBack;
      if (forward) {
        // Slide out to the left, then the new week springs in from the right.
        x.set(reduced ? 0 : withTiming(-40, { duration: 90 }, () => x.set(40)));
        scheduleOnRN(go, 1);
      } else if (backward) {
        x.set(reduced ? 0 : withTiming(40, { duration: 90 }, () => x.set(-40)));
        scheduleOnRN(go, -1);
      } else {
        x.set(withSpring(0, springs.gentle));
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    opacity: 1 - Math.min(0.5, Math.abs(x.get()) / 160),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.row, rowStyle]}
        accessibilityHint="Swipe left or right to change week"
      >
        {days.map((d) => (
          <DayChip
            key={d.toDateString()}
            day={d}
            selected={isSameDay(d, selected)}
            disabled={isDayDisabled(d, now)}
            today={isSameDay(d, now)}
            onPress={onSelect}
          />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}

interface ChipProps {
  day: Date;
  selected: boolean;
  disabled: boolean;
  today: boolean;
  onPress: (d: Date) => void;
}

const DayChip = memo(function DayChip({ day, selected, disabled, today, onPress }: ChipProps) {
  const t = useTheme();
  const reduced = useIsReducedMotion();
  const scale = useSharedValue(selected ? 1 : 0);
  const ring = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    if (selected && !reduced) {
      scale.set(withSequence(withTiming(0.6, { duration: 1 }), withSpring(1, springs.bouncy)));
    } else {
      scale.set(selected ? 1 : 0);
    }
    ring.set(withTiming(selected ? 1 : 0, { duration: reduced ? 1 : 220 }));
  }, [selected, reduced, scale, ring]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    opacity: scale.get() > 0 ? 1 : 0,
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.get() }));

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptics.selection();
        onPress(day);
      }}
      disabled={disabled}
      style={[
        styles.chip,
        { backgroundColor: t.colors.surface, opacity: disabled ? 0.38 : 1 },
        t.shadows.card,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${formatDateLabel(day)}${today ? ', today' : ''}${disabled ? ', unavailable' : ''}`}
      accessibilityState={{ selected, disabled }}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderColor: t.colors.primary }, ringStyle]}
      />
      <AppText
        variant="caption"
        style={[
          styles.weekday,
          { color: selected ? t.colors.textPrimary : t.colors.textSecondary },
        ]}
        maxFontSizeMultiplier={1.15}
      >
        {WEEKDAYS_SHORT[day.getDay()]}
      </AppText>
      <View style={styles.numWrap}>
        <Animated.View
          style={[styles.numCircle, { backgroundColor: t.colors.primary }, circleStyle]}
        />
        <AppText
          variant="bodyMedium"
          maxFontSizeMultiplier={1.15}
          style={{ color: selected ? '#fff' : today ? t.colors.primary : t.colors.textSecondary }}
        >
          {day.getDate()}
        </AppText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 26,
    minHeight: 92,
  },
  ring: { ...StyleSheet.absoluteFill, borderRadius: 26, borderWidth: 2 },
  weekday: { fontSize: 14, marginBottom: 6 },
  numWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  numCircle: { ...StyleSheet.absoluteFill, borderRadius: 19 },
});
