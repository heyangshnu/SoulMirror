import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { TopicListCard } from '@/components/guanxin/TopicListCard';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Topic = {
  id: string;
  title: string;
  domain: string;
  status: string;
  excerpt: string;
  updatedAt?: string;
};

type MingReport = { code: string; title: string; rel: string };

const FILTERS = ['all', 'active', 'pending', 'archived'] as const;

export default function TopicsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mingReports, setMingReports] = useState<MingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('active');

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      const statusParam = filter === 'all' ? '' : filter;
      Promise.all([
        api.get<Topic[]>(`/memory/topics${statusParam ? `?status=${statusParam}` : ''}`).catch(() => [] as Topic[]),
        api.get<MingReport[]>('/ming/reports').catch(() => [] as MingReport[]),
      ])
        .then(([topicList, reports]) => {
          setTopics(topicList);
          setMingReports(reports);
        })
        .finally(() => setLoading(false));
    }, [filter]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(
      (item) => item.title.toLowerCase().includes(q) || item.excerpt.toLowerCase().includes(q),
    );
  }, [topics, query]);

  return (
    <Screen>
      <Text style={styles.subtitle}>{t('topics.subtitle')}</Text>

      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder={t('topics.search')}
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Text
            key={f}
            style={[styles.filterChip, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            {t(`topics.filter.${f}`)}
          </Text>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : filtered.length === 0 && mingReports.length === 0 ? (
        <Text style={styles.empty}>{t('topics.empty')}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            mingReports.length > 0 ? (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={styles.sectionTitle}>{t('ming.reportTitle')}</Text>
                {mingReports.map((report) => (
                  <TopicListCard
                    key={report.rel}
                    title={report.title}
                    excerpt={report.code}
                    status="ming"
                    onPress={() =>
                      router.push({
                        pathname: '/ming/report/[code]',
                        params: { code: report.code, rel: report.rel },
                      })
                    }
                  />
                ))}
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <TopicListCard
              title={item.title}
              excerpt={item.excerpt}
              status={item.status}
              domain={item.domain === 'yuan' ? t('topics.domain.yuan') : t('topics.domain.jing')}
              updatedAt={item.updatedAt}
              onPress={() => router.push(`/topic/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.caption, marginBottom: spacing.md },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  filterChip: {
    ...typography.small,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    color: colors.textSecondary,
  },
  filterActive: { backgroundColor: colors.primaryMuted, color: colors.primary, fontWeight: '700' },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  sectionTitle: { ...typography.title, fontSize: 16, color: colors.primary, marginBottom: spacing.sm },
});
