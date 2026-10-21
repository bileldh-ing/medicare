import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';
import { springs } from '@/utils/motion';

interface Props<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  counts?: Partial<Record<T, number>>;
}

/** Pill segmented control with a gliding blue indicator. */
export function SegmentedControl<T extends string>({ options, value, onChange, counts }: Props<T>) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.indexOf(value));
  const segW = width / options.length;
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(withSpring(index * segW, springs.gentle));
  }, [index, segW, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      style={[styles.wrap, { backgroundColor: t.colors.blueTint, borderRadius: t.radii.button }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}
      accessibilityRole="tablist"
    >
      {width > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            { width: segW, backgroundColor: t.colors.primary, borderRadius: t.radii.button },
            indicator,
          ]}
        />
      ) : null}
      {options.map((opt) => {
        const active = opt === value;
        const count = counts?.[opt];
        return (
          <Pressable
            key={opt}
            style={styles.segment}
            onPress={() => {
              if (!active) haptics.selection();
              onChange(opt);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={count !== undefined ? `${opt}, ${count}` : opt}
          >
            <Text
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              numberOfLines={1}
              style={[
                t.typography.caption,
                { color: active ? t.colors.textOnBlue : t.colors.primary, fontSize: 14 },
              ]}
            >
              {opt}
              {count ? ` · ${count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4, minHeight: 48 },
  indicator: { position: 'absolute', top: 4, bottom: 4, left: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
});
