import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type AxisLink = { domain: string; title: string; excerpt: string; topicId?: string };

export default function MemoryEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [axes, setAxes] = useState<AxisLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ summary: string; axes: AxisLink[] }>(`/memory/events/${encodeURIComponent(id)}`)
      .then((res) => {
        setSummary(res.summary);
        setAxes(res.axes ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('memory.eventTitle')}</Text>
      <Text style={styles.summary}>{summary}</Text>

      {axes.map((axis, idx) => (
        <Pressable
          key={`${axis.domain}-${idx}`}
          onPress={() => {
            if (axis.topicId) router.push(`/topic/${axis.topicId}`);
          }}
          disabled={!axis.topicId}
        >
          <Card style={styles.card}>
            <Text style={styles.domain}>{axis.domain}</Text>
            <Text style={styles.cardTitle}>{axis.title}</Text>
            <Text style={styles.excerpt} numberOfLines={3}>
              {axis.excerpt}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md, marginBottom: spacing.sm },
  summary: { ...typography.body, lineHeight: 26, marginBottom: spacing.lg, color: colors.textSecondary },
  card: { marginBottom: spacing.md },
  domain: { ...typography.small, color: colors.primary, fontWeight: '700', marginBottom: 4 },
  cardTitle: { ...typography.title, fontSize: 17, marginBottom: 6 },
  excerpt: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
});
