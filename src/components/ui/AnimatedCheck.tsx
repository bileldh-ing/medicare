import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CHECK_LEN = 26;
const RING_LEN = 2 * Math.PI * 20;

interface Props {
  size?: number;
  color?: string;
  ring?: boolean;
  delay?: number;
}

/** A check mark that draws itself (stroke-dashoffset animation on the UI thread). */
export function AnimatedCheck({ size = 24, color = '#fff', ring = false, delay = 0 }: Props) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })),
    );
  }, [delay, progress]);

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LEN * (1 - progress.get()),
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LEN * (1 - progress.get()),
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden>
      {ring ? (
        <AnimatedCircle
          cx={24}
          cy={24}
          r={20}
          stroke={color}
          strokeWidth={3}
          fill="none"
          strokeDasharray={RING_LEN}
          animatedProps={ringProps}
          strokeLinecap="round"
        />
      ) : null}
      <AnimatedPath
        d="M15 24.5l6 6 12-13"
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={CHECK_LEN}
        animatedProps={checkProps}
      />
    </Svg>
  );
}
