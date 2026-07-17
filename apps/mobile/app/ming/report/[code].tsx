import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { MarkdownBody } from '@/components/ui/MarkdownBody';
import { useTranslation } from '@/hooks/useTranslation';
import { prepareReportMarkdown } from '@/lib/format-display-text';
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

  const displayTitle = title || t('ming.reportTitle');
  const prepared = prepareReportMarkdown(body, displayTitle);

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('ming.reportTitle'), headerTintColor: colors.primary }} />
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: displayTitle, headerTintColor: colors.primary }} />
      <View style={styles.header}>
        {code ? (
          <View style={styles.codeBadge}>
            <Text style={styles.code}>{code}</Text>
          </View>
        ) : null}
        <Text style={styles.title}>{displayTitle}</Text>
      </View>

      <Card style={styles.bodyCard}>
        {prepared ? (
          <MarkdownBody content={prepared} />
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
  code: { ...typography.small, color: colors.primary, fontWeight: '500' },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 34,
  },
  bodyCard: { paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  empty: {
    ...typography.body,
    fontWeight: '400',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
