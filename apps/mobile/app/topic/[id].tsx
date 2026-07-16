import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { EvidenceRow } from '@/components/guanxin/EvidenceRow';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Evidence = { kind: string; text: string };
type TabKey = 'overview' | 'insights' | 'next' | 'history';

export default function TopicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('overview');
  const [summary, setSummary] = useState('');
  const [title, setTitle] = useState('');
  const [insights, setInsights] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [history, setHistory] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<{
        title: string;
        summary: string;
        evidence: Evidence[];
        insights?: string;
        nextSteps?: string;
        history?: string;
      }>(`/memory/topics/${encodeURIComponent(id)}`)
      .then((res) => {
        setTitle(res.title);
        setSummary(res.summary);
        setEvidence(res.evidence ?? []);
        setInsights(res.insights ?? '');
        setNextSteps(res.nextSteps ?? '');
        setHistory(res.history ?? '');
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: t('topics.tab.overview') },
    { key: 'insights', label: t('topics.tab.insights') },
    { key: 'next', label: t('topics.tab.next') },
    { key: 'history', label: t('topics.tab.history') },
  ];

  return (
    <Screen scroll>
      <Text style={styles.title}>{title || t('topics.detail')}</Text>

      <View style={styles.tabRow}>
        {tabs.map(({ key, label }) => (
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'overview' ? (
        <>
          <Text style={styles.label}>{t('topics.aiSummary')}</Text>
          <Text style={styles.body}>{summary || t('dashboard.noSummary')}</Text>
          {evidence.map((item, idx) => (
            <EvidenceRow key={`${item.kind}-${idx}`} kind={item.kind} text={item.text} />
          ))}
        </>
      ) : null}

      {tab === 'insights' ? (
        <Text style={styles.body}>{insights || t('dashboard.noSummary')}</Text>
      ) : null}

      {tab === 'next' ? (
        <Text style={styles.body}>{nextSteps || t('dashboard.noSummary')}</Text>
      ) : null}

      {tab === 'history' ? (
        <Text style={styles.body}>{history || t('dashboard.noSummary')}</Text>
      ) : null}

      <Button
        title={t('topics.continueReflection')}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/chat',
            params: { prefill: t('topics.continuePrefill'), topicContext: id },
          } as Href)
        }
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md, marginBottom: spacing.md },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.small, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  label: { ...typography.caption, color: colors.primary, fontWeight: '700', marginBottom: 8, marginTop: spacing.md },
  body: { ...typography.body, lineHeight: 26 },
});
