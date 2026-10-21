import { Feather } from '@expo/vector-icons';
import { memo, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { MAX_FONT_SCALE } from '@/theme/typography';
import { useTheme, type Theme } from '@/theme';

import { AnimatedCheck } from './AnimatedCheck';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'white' | 'translucent' | 'outline' | 'ghost' | 'danger';
export type ButtonState = 'idle' | 'loading' | 'success';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  state?: ButtonState;
  disabled?: boolean;
  icon?: ComponentProps<typeof Feather>['name'];
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'lg' | 'sm';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

function palette(t: Theme, v: ButtonVariant) {
  const c = t.colors;
  switch (v) {
    case 'white':
      return { bg: c.surface, fg: c.primary, border: 'transparent' };
    case 'translucent':
      return { bg: 'rgba(255,255,255,0.18)', fg: c.textOnBlue, border: 'transparent' };
    case 'outline':
      return { bg: 'transparent', fg: c.primary, border: c.primary };
    case 'ghost':
      return { bg: c.blueTint, fg: c.primary, border: 'transparent' };
    case 'danger':
      return { bg: c.error, fg: '#fff', border: 'transparent' };
    default:
      return { bg: c.primary, fg: c.textOnBlue, border: 'transparent' };
  }
}

/** Pill button with spring press, loading spinner and self-drawing success check. */
export const Button = memo(function Button({
  title,
  onPress,
  variant = 'primary',
  state = 'idle',
  disabled,
  icon,
  style,
  size = 'lg',
  accessibilityLabel,
  accessibilityHint,
  testID,
}: Props) {
  const theme = useTheme();
  const p = palette(theme, variant);
  const height = size === 'lg' ? 56 : size === 'md' ? 48 : 44;
  const busy = state !== 'idle';

  return (
    <PressableScale
      testID={testID}
      onPress={busy ? undefined : onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: state === 'loading' }}
      style={[
        styles.base,
        {
          minHeight: height,
          backgroundColor: p.bg,
          borderColor: p.border,
          borderRadius: theme.radii.button,
          opacity: disabled ? 0.5 : 1,
        },
        variant === 'primary' && !disabled ? theme.shadows.soft : null,
        style,
      ]}
    >
      {state === 'loading' ? (
        <Animated.View
          key="loading"
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
        >
          <ActivityIndicator color={p.fg} />
        </Animated.View>
      ) : state === 'success' ? (
        <Animated.View key="success" entering={FadeIn.duration(160)}>
          <AnimatedCheck size={28} color={p.fg} />
        </Animated.View>
      ) : (
        <Animated.View key="idle" entering={FadeIn.duration(160)} style={styles.row}>
          {icon ? <Feather name={icon} size={18} color={p.fg} style={styles.icon} /> : null}
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            numberOfLines={1}
            style={[theme.typography.button, { color: p.fg }, size === 'sm' && styles.smallText]}
          >
            {title}
          </Text>
        </Animated.View>
      )}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: 8 },
  smallText: { fontSize: 15 },
});
