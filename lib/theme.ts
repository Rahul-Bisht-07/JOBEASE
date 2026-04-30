/* ─── Light palette ─── */
export const lightColors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  secondary: '#EC4899',
  accent: '#10B981',
  background: '#FFFFFF',
  backgroundDark: '#F9FAFB',
  backgroundSoft: '#F4F6FB',
  text: '#1F2937',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  textMutedBlue: '#94A3B8',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  card: '#FFFFFF',
  chipBackground: '#EEF2FF',
};

/* ─── Dark palette ─── */
export const darkColors: ThemeColors = {
  primary: '#818CF8',
  primaryDark: '#6366F1',
  primaryLight: '#A5B4FC',
  secondary: '#F472B6',
  accent: '#34D399',
  background: '#0F172A',
  backgroundDark: '#1E293B',
  backgroundSoft: '#0F172A',
  text: '#F1F5F9',
  textLight: '#94A3B8',
  textMuted: '#64748B',
  textMutedBlue: '#64748B',
  border: '#334155',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  white: '#FFFFFF',
  black: '#000000',
  card: '#1E293B',
  chipBackground: '#1E293B',
};

/* ─── Type for color palettes ─── */
export type ThemeColors = typeof lightColors;

/* ─── Backward-compat export (light is default) ─── */
export const colors = lightColors;

export const gradients = {
  primary: ['#6366F1', '#8B5CF6', '#EC4899'],
  secondary: ['#667EEA', '#764BA2'],
  success: ['#10B981', '#059669'],
  sunset: ['#F97316', '#EC4899', '#8B5CF6'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const elevation = {
  card: {
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

const fontFamilies = {
  light: 'TenorSans_400Regular',
  regular: 'TenorSans_400Regular',
  italic: 'TenorSans_400Regular',
  bold: 'TenorSans_400Regular',
  black: 'TenorSans_400Regular',
};

export const typography = {
  h1: {
    fontSize: 32,
    fontFamily: fontFamilies.black,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    lineHeight: 16,
  },
};
