import { colors } from '@/theme/tokens';

const tintColor = colors.primary;

export default {
  light: {
    text: colors.text,
    background: colors.background,
    tint: tintColor,
    tabIconDefault: colors.textMuted,
    tabIconSelected: tintColor,
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColor,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColor,
  },
};
