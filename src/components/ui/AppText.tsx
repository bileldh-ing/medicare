import { Text, type TextProps } from 'react-native';

import { MAX_FONT_SCALE, typography } from '@/theme/typography';
import { useTheme, type Palette } from '@/theme';

type ColorKey = 'primary' | 'secondary' | 'muted' | 'accent' | 'onBlue' | 'onBlueMuted' | 'error';

const COLOR_MAP: Record<ColorKey, keyof Palette> = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  muted: 'textMuted',
  accent: 'primary',
  onBlue: 'textOnBlue',
  onBlueMuted: 'textOnBlueMuted',
  error: 'error',
};

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  color?: ColorKey;
}

/** Text with design-system typography, theme colour and capped dynamic type (1.3x). */
export function AppText({ variant = 'body', color = 'primary', style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      {...rest}
      style={[typography[variant], { color: colors[COLOR_MAP[color]] }, style]}
    />
  );
}
