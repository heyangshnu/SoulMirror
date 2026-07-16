import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = {
  title: string;
  excerpt: string;
  status?: string;
  domain?: string;
  updatedAt?: string;
  onPress?: () => void;
};

export function TopicListCard({ title, excerpt, status, domain, updatedAt, onPress }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <View style={styles.row}>
          {domain ? <Text style={styles.badge}>{domain}</Text> : null}
          {status ? <Text style={styles.status}>{status}</Text> : null}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.excerpt} numberOfLines={3}>
          {excerpt}
        </Text>
        {updatedAt ? <Text style={styles.meta}>{updatedAt}</Text> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badge: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  status: { ...typography.small, color: colors.sage },
  title: { ...typography.title, fontSize: 17, marginBottom: 6 },
  excerpt: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  meta: { ...typography.small, color: colors.textMuted, marginTop: 8 },
});
