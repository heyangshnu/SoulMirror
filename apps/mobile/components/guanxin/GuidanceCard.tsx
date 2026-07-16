import { StyleSheet, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { formatDisplaySummary } from '@/lib/format-display-text';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = { text: string; title?: string };

export function GuidanceCard({ text, title = 'Guanxin guidance' }: Props) {
  const body = formatDisplaySummary(text, 280) || text.trim();
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.text}>{body}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    borderColor: colors.sageMuted,
    borderWidth: 1,
    backgroundColor: '#F7FAF7',
  },
  label: {
    ...typography.small,
    color: colors.sage,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  text: { ...typography.body, lineHeight: 26, color: colors.text },
});
