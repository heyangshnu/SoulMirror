import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { ReportSummaryText } from '@/components/ui/ReportSummaryText';
import { useTranslation, reportTypeLabel } from '@/hooks/useTranslation';
import { useLocaleStore } from '@/store/locale';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Report = {
  _id: string;
  testType: string;
  title: string;
  summary: string;
  headlineSummary?: string;
  themeLabel?: string;
  score?: number;
  createdAt: string;
};

export default function ReportsScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api
        .get<Report[]>('/reports')
        .then(setReports)
        .catch(() => setReports([]))
        .finally(() => setLoading(false));
    }, []),
  );

  const dateLocale = locale === 'en' ? 'en-US' : 'zh-CN';

  return (
    <Screen>
      <Text style={styles.title}>{t('reports.title')}</Text>
      <Text style={styles.subtitle}>{t('reports.subtitle')}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : reports.length === 0 ? (
        <Card>
          <Text style={styles.empty}>{t('reports.empty')}</Text>
        </Card>
      ) : (
        reports.map((r) => {
          const headline = r.headlineSummary ?? r.summary;
          const label = r.themeLabel ?? reportTypeLabel(t, r.testType);
          const isZiwei = r.testType.startsWith('ziwei');
          return (
            <Card
              key={r._id}
              style={styles.reportCard}
              onPress={() =>
                isZiwei ? router.push('/chart/result') : router.push(`/report/${r._id}`)
              }
            >
              <View style={styles.row}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{label}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle}>{r.title}</Text>
              <ReportSummaryText>{headline}</ReportSummaryText>
              {!isZiwei && (
                <Pressable onPress={() => router.push(`/report/${r._id}?mode=detail`)}>
                  <Text style={styles.link}>{t('reports.viewFull')}</Text>
                </Pressable>
              )}
              <Text style={styles.date}>{new Date(r.createdAt).toLocaleDateString(dateLocale)}</Text>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md },
  subtitle: { ...typography.caption, marginBottom: spacing.lg },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  reportCard: { alignSelf: 'stretch' },
  cardTitle: { ...typography.title, fontSize: 16, marginBottom: 6 },
  link: { ...typography.caption, color: colors.primary, fontWeight: '600', marginTop: 10 },
  date: { ...typography.small, marginTop: 10 },
});
