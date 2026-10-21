import { memo, useCallback, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/utils/haptics';
import { springs, useIsReducedMotion } from '@/utils/motion';

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (spec: 0.97). */
  scaleTo?: number;
  /** Light haptic on press. */
  haptic?: boolean;
}

/** Every tappable surface: springs to 0.97 on press with a light haptic tick. */
export const PressableScale = memo(function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  hitSlop = 4,
  ...rest
}: PressableScaleProps) {
  const reduced = useIsReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const handleIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (e) => {
      if (!reduced) scale.set(withSpring(scaleTo, springs.press));
      onPressIn?.(e);
    },
    [onPressIn, reduced, scale, scaleTo],
  );
  const handleOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (e) => {
      scale.set(withSpring(1, springs.press));
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );
  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>(
    (e) => {
      if (haptic) haptics.light();
      onPress?.(e);
    },
    [haptic, onPress],
  );

  return (
    <Pressable
      {...rest}
      hitSlop={hitSlop}
      disabled={disabled}
      onPressIn={handleIn}
      onPressOut={handleOut}
      onPress={handlePress}
      accessibilityState={{ disabled: !!disabled, ...rest.accessibilityState }}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
});
