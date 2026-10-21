import type { TextStyle } from 'react-native';

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Max dynamic font scale supported by layouts (spec: up to 1.3x). */
export const MAX_FONT_SCALE = 1.3;

export const typography = {
  hero: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  screenTitle: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  doctorName: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, letterSpacing: -0.8 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
} satisfies Record<string, TextStyle>;
