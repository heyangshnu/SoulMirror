import { StyleSheet, Text, TextStyle } from 'react-native';
import { colors, typography } from '@/theme/tokens';

type Props = {
  children: string;
  style?: TextStyle;
  variant?: 'primary' | 'secondary';
};

/** 报告总结正文：高度随内容自适应，不截断 */
export function ReportSummaryText({ children, style, variant = 'secondary' }: Props) {
  return (
    <Text
      style={[styles.base, variant === 'primary' ? styles.primary : styles.secondary, style]}
      textBreakStrategy="simple"
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    ...typography.body,
    lineHeight: 26,
    fontSize: 16,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  primary: { color: colors.text },
  secondary: { color: colors.textSecondary },
});
