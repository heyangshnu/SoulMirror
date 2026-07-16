/**
 * guanxin 暖色 mindful 设计 tokens
 * 参考：docs/ARCHIVE_DEVELOPMENT_SCHEME.md §2.2
 */
export const guanxinColors = {
  primary: '#B85C38',
  primaryLight: '#D4845F',
  primaryMuted: '#F5E6DE',
  sage: '#6B8F71',
  sageMuted: '#E8F0E9',
  amber: '#C9A227',
  background: '#FDFBF9',
  backgroundSecondary: '#F5F0EB',
  card: '#FFFFFF',
  text: '#2C2416',
  textSecondary: '#6B5E4F',
  textMuted: '#A89888',
  border: '#EBE4DC',
  danger: '#C44B4B',
  shadow: 'rgba(44, 36, 22, 0.08)',
};

export const guanxinSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const guanxinRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  pill: 24,
  full: 999,
};

export const guanxinTypography = {
  hero: { fontSize: 28, fontWeight: '700' as const, color: guanxinColors.text },
  title: { fontSize: 20, fontWeight: '600' as const, color: guanxinColors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: guanxinColors.text, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, color: guanxinColors.textSecondary },
  small: { fontSize: 12, fontWeight: '400' as const, color: guanxinColors.textMuted },
};

export const useGuanxinTheme = true;
