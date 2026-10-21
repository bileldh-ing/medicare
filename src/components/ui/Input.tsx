import { Feather } from '@expo/vector-icons';
import {
  useEffect,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactNode,
  type Ref,
} from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme } from '@/theme';
import { useIsReducedMotion } from '@/utils/motion';

export interface InputProps extends TextInputProps {
  icon?: ComponentProps<typeof Feather>['name'];
  error?: string;
  /** Increment to trigger the error shake. */
  shakeKey?: number;
  right?: ReactNode;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

/** White rounded field: animated focus border + lift, left icon, inline error, shake. */
export function Input({
  icon,
  error,
  shakeKey = 0,
  right,
  style,
  onFocus,
  onBlur,
  ref,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const c = theme.colors;
  const reduced = useIsReducedMotion();
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    focus.set(withTiming(focused ? 1 : 0, { duration: 200 }));
  }, [focused, focus]);

  useEffect(() => {
    if (shakeKey === 0 || reduced) return;
    shake.set(
      withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [shakeKey, reduced, shake]);

  const borderIdle = error ? c.error : c.surface;
  const borderFocus = error ? c.error : c.primary;
  const animated = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.get(), [0, 1], [borderIdle, borderFocus]),
    transform: [{ translateX: shake.get() }, { translateY: -1.5 * focus.get() }],
  }));

  return (
    <View>
      <Animated.View
        style={[
          styles.field,
          { backgroundColor: c.surface, borderRadius: theme.radii.input },
          theme.shadows.card,
          animated,
        ]}
      >
        {icon ? (
          <Feather
            name={icon}
            size={20}
            color={focused ? c.primary : c.textSecondary}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textMuted}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[styles.input, theme.typography.body, { color: c.textPrimary }, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          accessibilityHint={error}
          {...rest}
        />
        {right}
      </Animated.View>
      {error ? (
        <Animated.View entering={reduced ? undefined : FadeInDown.duration(180)}>
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[theme.typography.caption, styles.error, { color: c.error }]}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {error}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 18,
    borderWidth: 1.5,
  },
  icon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14 },
  error: { marginTop: 6, marginLeft: 18 },
});
