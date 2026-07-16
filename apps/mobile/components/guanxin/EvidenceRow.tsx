import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = { kind: string; text: string };

export function EvidenceRow({ kind, text }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.kind}>{kind}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kind: { ...typography.small, color: colors.sage, fontWeight: '700', marginBottom: 4 },
  text: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
});
