import { useMemo } from 'react';
import {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useReducedMotion,
  type WithSpringConfig,
} from 'react-native-reanimated';

import { useSettingsStore } from '@/features/settings/settingsStore';

/** Calm, quick, springy (spec: 200-500 ms). */
export const springs = {
  press: { damping: 18, stiffness: 320, mass: 0.6 } satisfies WithSpringConfig,
  gentle: { damping: 20, stiffness: 180, mass: 0.9 } satisfies WithSpringConfig,
  bouncy: { damping: 11, stiffness: 220, mass: 0.7 } satisfies WithSpringConfig,
  sheet: { damping: 24, stiffness: 220, mass: 1 } satisfies WithSpringConfig,
};

/** True when either the OS or the in-app setting asks for reduced motion. */
export function useIsReducedMotion(): boolean {
  const system = useReducedMotion();
  const inApp = useSettingsStore((s) => s.reducedMotion);
  return system || inApp;
}

/**
 * Layout-animation builders that collapse to `undefined` when reduced motion is on.
 * `enter(i)` gives a staggered spring fade/slide-up for the i-th element.
 */
export function useMotion() {
  const reduced = useIsReducedMotion();
  return useMemo(
    () => ({
      reduced,
      enter: (index = 0, step = 70) =>
        reduced
          ? undefined
          : FadeInDown.delay(index * step)
              .springify()
              .damping(18)
              .stiffness(160)
              .reduceMotion(ReduceMotion.System),
      fadeIn: (delay = 0) => (reduced ? undefined : FadeIn.delay(delay).duration(260)),
    }),
    [reduced],
  );
}
