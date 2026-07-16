import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { MarkdownBody } from '@/components/ui/MarkdownBody';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export default function MingReportScreen() {
  const { code, rel } = useLocalSearchParams<{ code: string; rel?: string }>();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    const relQuery = typeof rel === 'string' && rel ? `?rel=${encodeURIComponent(rel)}` : '';
    api
      .get<{ title: string; body: string }>(`/ming/reports/${encodeURIComponent(code)}${relQuery}`)
      .then((res) => {
        setTitle(res.title);
        setBody(res.body);
      })
      .finally(() => setLoading(false));
  }, [code, rel]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        {code ? (
          <View style={styles.codeBadge}>
            <Text style={styles.code}>{code}</Text>
          </View>
        ) : null}
        <Text style={styles.title}>{title || t('ming.reportTitle')}</Text>
      </View>

      <Card style={styles.bodyCard}>
        {body?.trim() ? (
          <MarkdownBody content={body} />
        ) : (
          <Text style={styles.empty}>{t('dashboard.noSummary')}</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.md, marginBottom: spacing.md },
  codeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  code: { ...typography.small, color: colors.primary, fontWeight: '700' },
  title: { ...typography.hero, lineHeight: 34 },
  bodyCard: { paddingVertical: spacing.lg },
  empty: { ...typography.body, color: colors.textMuted, fontStyle: 'italic' },
});
