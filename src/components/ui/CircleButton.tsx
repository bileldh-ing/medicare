import { Feather } from '@expo/vector-icons';
import { memo, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { PressableScale } from './PressableScale';

interface Props {
  icon?: ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  /** Small green dot (e.g. unread reminders). */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  shadow?: boolean;
}

/** 52x52 white circle with a soft shadow. */
export const CircleButton = memo(function CircleButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 52,
  iconSize = 22,
  color,
  background,
  dot,
  style,
  children,
  shadow = true,
}: Props) {
  const t = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      scaleTo={0.92}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background ?? t.colors.surface,
        },
        shadow ? t.shadows.soft : null,
        style,
      ]}
    >
      {children ??
        (icon ? (
          <Feather name={icon} size={iconSize} color={color ?? t.colors.textPrimary} />
        ) : null)}
      {dot ? (
        <View
          style={[
            styles.dot,
            { backgroundColor: t.colors.success, borderColor: background ?? t.colors.surface },
          ]}
          accessibilityElementsHidden
        />
      ) : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 13,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
