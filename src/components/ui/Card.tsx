import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** Rounded white surface (radius 24) with a soft shadow. */
export function Card({ children, style, padded = true }: Props) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.colors.surface,
          borderRadius: t.radii.card,
          padding: padded ? t.spacing.md : 0,
        },
        t.shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
