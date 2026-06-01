export const colors = {
  primary: '#7C6CF0',
  primaryLight: '#9D91F5',
  primaryMuted: '#EDE9FE',
  background: '#FFFFFF',
  backgroundSecondary: '#F7F7F9',
  card: '#FFFFFF',
  text: '#1A1A1E',
  textSecondary: '#6B6B76',
  textMuted: '#A8A8B3',
  border: '#EBEBEF',
  success: '#34C759',
  danger: '#FF3B30',
  shadow: 'rgba(0,0,0,0.06)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 24,
  full: 999,
};

export const typography = {
  hero: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  title: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
  small: { fontSize: 12, fontWeight: '400' as const, color: colors.textMuted },
};
