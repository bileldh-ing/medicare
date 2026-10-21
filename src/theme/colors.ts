export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  primaryPressed: string;
  blueTint: string;
  blueTintBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnBlue: string;
  textOnBlueMuted: string;
  star: string;
  success: string;
  error: string;
  divider: string;
  shadow: string;
  overlay: string;
  tabBar: string;
  inactiveIcon: string;
  skeleton: string;
  skeletonHighlight: string;
}

export const lightColors: Palette = {
  background: '#F5F8FE',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFF',
  primary: '#4C7AD5',
  primaryPressed: '#3F68BC',
  blueTint: '#E9EFFB',
  blueTintBorder: '#C9D8F5',
  textPrimary: '#0F172A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnBlue: '#FFFFFF',
  textOnBlueMuted: 'rgba(255,255,255,0.72)',
  star: '#F5B301',
  success: '#22C55E',
  error: '#EF4444',
  divider: '#EDF1F9',
  shadow: 'rgba(76,122,213,0.12)',
  overlay: 'rgba(15,23,42,0.45)',
  tabBar: 'rgba(214,220,232,0.92)',
  inactiveIcon: '#FFFFFF',
  skeleton: '#E6ECF7',
  skeletonHighlight: '#F4F7FD',
};

/** Dark mode bonus: deep navy surfaces, same blue accent. */
export const darkColors: Palette = {
  background: '#0B1220',
  surface: '#131C2E',
  surfaceAlt: '#18233A',
  primary: '#5B87DD',
  primaryPressed: '#4C7AD5',
  blueTint: '#1C2A47',
  blueTintBorder: '#2C4170',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textOnBlue: '#FFFFFF',
  textOnBlueMuted: 'rgba(255,255,255,0.72)',
  star: '#F5B301',
  success: '#22C55E',
  error: '#F87171',
  divider: '#1E293B',
  shadow: 'rgba(0,0,0,0.35)',
  overlay: 'rgba(0,0,0,0.6)',
  tabBar: 'rgba(30,41,64,0.94)',
  inactiveIcon: '#94A3B8',
  skeleton: '#1C2740',
  skeletonHighlight: '#26324D',
};
