import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { MarkdownBody } from '@/components/ui/MarkdownBody';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDisplaySummary, formatNoteTitle } from '@/lib/format-display-text';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type DomainDetail = {
  label?: string;
  summary?: string;
  fileCount?: number;
  recent?: string[];
};

const DOMAIN_LABELS: Record<string, string> = {
  ming: 'today.axis.ming',
  yuan: 'today.axis.yuan',
  jing: 'today.axis.jing',
  yuan_rel: 'today.axis.yuanRel',
  li: 'today.axis.li',
};

export default function AxisDetailScreen() {
  const { domain } = useLocalSearchParams<{ domain: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [detail, setDetail] = useState<DomainDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!domain) return;
      setLoading(true);
      api
        .get<DomainDetail>(`/memory/domain/${encodeURIComponent(domain)}`)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setLoading(false));
    }, [domain]),
  );

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const labelKey = DOMAIN_LABELS[domain ?? ''] ?? 'dashboard.axesTitle';
  const summary = formatDisplaySummary(detail?.summary, 240);

  return (
    <Screen scroll>
      <Text style={styles.eyebrow}>{t('dashboard.axesSubtitle')}</Text>
      <Text style={styles.title}>{detail?.label ?? t(labelKey)}</Text>

      <Card style={styles.summaryCard}>
        {summary ? (
          <MarkdownBody content={summary} />
        ) : (
          <Text style={styles.empty}>{t('dashboard.noSummary')}</Text>
        )}
        {typeof detail?.fileCount === 'number' ? (
          <Text style={styles.meta}>{t('dashboard.notesCount', { count: detail.fileCount })}</Text>
        ) : null}
      </Card>

      {detail?.recent && detail.recent.length > 0 ? (
        <>
          <Text style={styles.section}>{t('dashboard.recentNotes')}</Text>
          <Card style={styles.listCard}>
            {detail.recent.map((noteId, index) => {
              const title = formatNoteTitle(noteId) || noteId;
              return (
                <View key={noteId}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <Pressable
                    style={styles.noteRow}
                    onPress={() => router.push(`/memory/item/${encodeURIComponent(noteId)}`)}
                  >
                    <Text style={styles.noteText} numberOfLines={2}>
                      {title}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  title: { ...typography.hero, marginTop: 6, marginBottom: spacing.md },
  summaryCard: { marginBottom: spacing.lg },
  empty: { ...typography.body, color: colors.textMuted, fontStyle: 'italic', lineHeight: 24 },
  meta: { ...typography.small, color: colors.textMuted, marginTop: spacing.md },
  section: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  listCard: { paddingVertical: spacing.xs, paddingHorizontal: 0 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  noteText: { ...typography.body, flex: 1, color: colors.text, lineHeight: 22 },
  chevron: { fontSize: 20, color: colors.textMuted },
});
