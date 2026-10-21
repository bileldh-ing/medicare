import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Chip } from '@/components/ui/Chip';
import { SPECIALTIES } from '@/features/doctors/doctors';
import type { SpecialtyFilter } from '@/features/doctors/doctorsStore';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { springs, useIsReducedMotion } from '@/utils/motion';

const OPTIONS: SpecialtyFilter[] = ['All', ...SPECIALTIES];
const GAP = 10;

interface Props {
  value: SpecialtyFilter;
  onChange: (v: SpecialtyFilter) => void;
  /** Horizontal screen padding so the last chip is cut off at the edge. */
  inset: number;
}

/** Specialty chips with ONE shared blue pill that slides between the selected chips. */
export function FilterChips({ value, onChange, inset }: Props) {
  const t = useTheme();
  const reduced = useIsReducedMotion();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [layouts, setLayouts] = useState<Record<string, { x: number; w: number }>>({});
  const px = useSharedValue(0);
  const pw = useSharedValue(0);
  const current = layouts[value];

  useEffect(() => {
    if (!current) return;
    if (reduced || pw.get() === 0) {
      px.set(current.x);
      pw.set(current.w);
    } else {
      px.set(withSpring(current.x, springs.gentle));
      pw.set(withSpring(current.w, springs.gentle));
    }
    scrollRef.current?.scrollTo({ x: Math.max(0, current.x - inset * 2), animated: !reduced });
  }, [current, reduced, px, pw, inset]);

  const pill = useAnimatedStyle(() => ({ width: pw.get(), transform: [{ translateX: px.get() }] }));

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: inset }}
      accessibilityRole="tablist"
    >
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const l = layouts[opt];
          return l ? (
            <View
              key={`bg-${opt}`}
              pointerEvents="none"
              style={[
                styles.bg,
                {
                  left: l.x,
                  width: l.w,
                  backgroundColor: t.colors.blueTint,
                  borderRadius: t.radii.chip,
                },
              ]}
            />
          ) : null;
        })}
        {current ? (
          <Animated.View
            style={[
              styles.pill,
              { backgroundColor: t.colors.primary, borderRadius: t.radii.chip },
              pill,
            ]}
          />
        ) : null}
        {OPTIONS.map((opt) => {
          const selected = opt === value;
          return (
            <View
              key={opt}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                setLayouts((prev) =>
                  prev[opt]?.x === x && prev[opt]?.w === width
                    ? prev
                    : { ...prev, [opt]: { x, w: width } },
                );
              }}
            >
              <Chip
                label={opt}
                selected={selected}
                transparent={!!current}
                accessibilityHint={`Show ${opt === 'All' ? 'all doctors' : `${opt} doctors`}`}
                onPress={() => {
                  if (!selected) haptics.selection();
                  onChange(opt);
                }}
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP },
  pill: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  bg: { position: 'absolute', top: 0, bottom: 0 },
});
