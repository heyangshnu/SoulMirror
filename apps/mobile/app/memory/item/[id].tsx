import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { MarkdownBody } from '@/components/ui/MarkdownBody';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDisplaySummary, formatNoteTitle } from '@/lib/format-display-text';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Evidence = { kind: string; text: string };

export default function MemoryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<{ title: string; summary: string; body: string; evidence: Evidence[] }>(
        `/memory/topics/${encodeURIComponent(id)}`,
      )
      .then((res) => {
        setTitle(res.title);
        setSummary(res.summary);
        setBody(res.body);
        setEvidence(res.evidence ?? []);
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

  const displayTitle = formatNoteTitle(title) || title || t('memory.title');
  const displaySummary = formatDisplaySummary(summary, 200);

  return (
    <Screen scroll>
      <Text style={styles.title}>{displayTitle}</Text>

      {displaySummary ? (
        <Card style={styles.summaryCard}>
          <Text style={styles.label}>{t('topics.aiSummary')}</Text>
          <Text style={styles.summary}>{displaySummary}</Text>
        </Card>
      ) : null}

      {evidence.length > 0 ? (
        <>
          <Text style={styles.section}>{t('topics.evidence')}</Text>
          {evidence.map((item, idx) => (
            <Card key={`${item.kind}-${idx}`} style={styles.evidenceCard}>
              <Text style={styles.evidenceKind}>{item.kind}</Text>
              <Text style={styles.evidenceText}>
                {formatDisplaySummary(item.text, 220) || item.text}
              </Text>
            </Card>
          ))}
        </>
      ) : body ? (
        <Card style={styles.bodyCard}>
          <MarkdownBody content={body} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md, marginBottom: spacing.md, lineHeight: 34 },
  summaryCard: { marginBottom: spacing.md },
  label: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 8,
  },
  section: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  summary: { ...typography.body, lineHeight: 26, color: colors.text },
  bodyCard: { paddingVertical: spacing.lg },
  evidenceCard: { marginBottom: spacing.sm },
  evidenceKind: { ...typography.small, color: colors.sage, fontWeight: '700', marginBottom: 6 },
  evidenceText: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
});
