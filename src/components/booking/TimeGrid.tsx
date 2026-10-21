import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';
import type { Slot } from '@/features/appointments/slots';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { useIsReducedMotion } from '@/utils/motion';

interface Props {
  slots: Slot[];
  selectedId: string | null;
  onSelect: (slot: Slot) => void;
  /** Changes whenever the day/page changes, re-running the staggered fade. */
  renderKey: string;
  onSwipePage: (dir: -1 | 1) => void;
}

const STATUS_A11Y: Record<Slot['status'], string> = {
  available: 'available',
  unavailable: 'unavailable',
  booked: 'you already have an appointment at this time',
  past: 'time has passed',
};

/** 3-column grid of time chips. Swipe horizontally to change page. */
export function TimeGrid({ slots, selectedId, onSelect, renderKey, onSwipePage }: Props) {
  const reduced = useIsReducedMotion();

  const pan = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      if (e.translationX < -40) scheduleOnRN(onSwipePage, 1);
      else if (e.translationX > 40) scheduleOnRN(onSwipePage, -1);
    });

  return (
    <GestureDetector gesture={pan}>
      <View
        key={renderKey}
        style={styles.grid}
        accessibilityHint="Swipe left or right for more times"
      >
        {slots.map((slot, i) => (
          <Animated.View
            key={slot.id}
            style={styles.cell}
            entering={reduced ? undefined : FadeIn.delay(i * 28).duration(220)}
          >
            <TimeChip slot={slot} selected={slot.id === selectedId} onPress={onSelect} />
          </Animated.View>
        ))}
      </View>
    </GestureDetector>
  );
}

const TimeChip = memo(function TimeChip({
  slot,
  selected,
  onPress,
}: {
  slot: Slot;
  selected: boolean;
  onPress: (s: Slot) => void;
}) {
  const t = useTheme();
  const disabled = slot.status !== 'available';
  const p = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(selected ? 1 : 0, { duration: 200 }));
  }, [selected, p]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.get(), [0, 1], [t.colors.surface, t.colors.primary]),
  }));

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress(slot);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${slot.label}, ${STATUS_A11Y[slot.status]}`}
      accessibilityState={{ selected, disabled }}
    >
      <Animated.View
        style={[
          styles.chip,
          { backgroundColor: t.colors.surface, opacity: disabled ? 0.4 : 1 },
          borderStyle,
        ]}
      >
        <AppText
          variant="bodyMedium"
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
          style={[
            styles.text,
            { color: selected ? t.colors.primary : t.colors.textSecondary },
            slot.status === 'booked' && styles.struck,
          ]}
        >
          {slot.label}
        </AppText>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '33.333%', padding: 5 },
  chip: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  text: { fontSize: 15 },
  struck: { textDecorationLine: 'line-through' },
});
