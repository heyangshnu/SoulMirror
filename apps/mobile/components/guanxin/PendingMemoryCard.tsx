import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = {
  title: string;
  excerpt: string;
  domain?: string;
  confirmLabel: string;
  rejectLabel: string;
  onConfirm: () => void;
  onReject: () => void;
  disabled?: boolean;
  onPressDetail?: () => void;
};

export function PendingMemoryCard({
  title,
  excerpt,
  domain,
  confirmLabel,
  rejectLabel,
  onConfirm,
  onReject,
  disabled,
  onPressDetail,
}: Props) {
  return (
    <Card style={styles.card}>
      {onPressDetail ? (
        <Text style={styles.title} onPress={onPressDetail}>
          {title}
        </Text>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
      {domain ? <Text style={styles.domain}>{domain}</Text> : null}
      <Text style={styles.excerpt}>{excerpt}</Text>
      <View style={styles.actions}>
        <Button title={confirmLabel} onPress={onConfirm} disabled={disabled} style={styles.btn} />
        <Button title={rejectLabel} variant="secondary" onPress={onReject} disabled={disabled} style={styles.btn} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  domain: { ...typography.small, color: colors.amber, fontWeight: '700', marginBottom: 4 },
  title: { ...typography.title, fontSize: 17, marginBottom: 6 },
  excerpt: { ...typography.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1 },
});
