import type { ViewStyle } from 'react-native';

import type { Palette } from './colors';

export function makeShadows(c: Palette, isDark: boolean) {
  const soft: ViewStyle = {
    shadowColor: c.primary,
    shadowOpacity: isDark ? 0 : 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  };
  const card: ViewStyle = {
    shadowColor: c.primary,
    shadowOpacity: isDark ? 0 : 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  };
  const strong: ViewStyle = {
    shadowColor: '#3F68BC',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  };
  return { soft, card, strong };
}

export type Shadows = ReturnType<typeof makeShadows>;
