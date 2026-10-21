import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/features/settings/settingsStore';

import { darkColors, lightColors, type Palette } from './colors';
import { makeShadows, type Shadows } from './shadows';
import { radii, sizes, spacing } from './spacing';
import { fonts, typography } from './typography';

export interface Theme {
  isDark: boolean;
  colors: Palette;
  shadows: Shadows;
  spacing: typeof spacing;
  radii: typeof radii;
  sizes: typeof sizes;
  typography: typeof typography;
  fonts: typeof fonts;
}

const lightTheme: Theme = {
  isDark: false,
  colors: lightColors,
  shadows: makeShadows(lightColors, false),
  spacing,
  radii,
  sizes,
  typography,
  fonts,
};

const darkTheme: Theme = {
  isDark: true,
  colors: darkColors,
  shadows: makeShadows(darkColors, true),
  spacing,
  radii,
  sizes,
  typography,
  fonts,
};

/** Resolves the active theme from the in-app setting (system / light / dark). */
export function useTheme(): Theme {
  const system = useColorScheme();
  const mode = useSettingsStore((s) => s.themeMode);
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return dark ? darkTheme : lightTheme;
}

export { darkColors, fonts, lightColors, radii, sizes, spacing, typography };
export type { Palette };
