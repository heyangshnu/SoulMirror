import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReportGeneratingOverlay } from '@/components/ui/ReportGeneratingOverlay';
import { ReportSummaryText } from '@/components/ui/ReportSummaryText';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type ReportCard = {
  _id: string;
  title: string;
  themeLabel?: string;
  headlineSummary: string;
  testType: string;
};

type HubData = {
  natal: ReportCard | null;
  daxian: ReportCard | null;
  liunian: ReportCard | null;
  year: number;
  horoscope?: { decadal?: { range: string }; yearly?: { palace: string } };
};

function SummaryCard({
  label,
  report,
  loading,
  onGenerate,
  onDetail,
  extra,
  t,
}: {
  label: string;
  report: ReportCard | null;
  loading?: boolean;
  onGenerate?: () => void;
  onDetail?: () => void;
  extra?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <Card style={styles.summaryCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>{label}</Text>
        {report?.themeLabel ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{report.themeLabel}</Text>
          </View>
        ) : null}
      </View>
      {extra ? <Text style={styles.extra}>{extra}</Text> : null}
      {report ? (
        <>
          <ReportSummaryText variant="primary">{report.headlineSummary}</ReportSummaryText>
          <Pressable onPress={onDetail} style={styles.detailLink}>
            <Text style={styles.detailLinkText}>{t('common.viewFull')}</Text>
            <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor={colors.primary} />
          </Pressable>
        </>
      ) : (
        <Button title={t('chart.generateLabel', { label })} onPress={() => onGenerate?.()} loading={loading} style={{ marginTop: 8 }} />
      )}
    </Card>
  );
}

export default function ChartResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { natalId: _natalId } = useLocalSearchParams<{ natalId?: string }>();
  const [hub, setHub] = useState<HubData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState<'daxian' | 'liunian' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<HubData>(`/chart/report-hub?year=${year}`)
      .then(setHub)
      .catch(() => setHub(null))
      .finally(() => setLoading(false));
  }, [year]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const genDaxian = async () => {
    setGenLoading('daxian');
    try {
      await api.post('/chart/reports/daxian');
      load();
    } catch (e) {
      Alert.alert(t('chart.genFail'), e instanceof Error ? e.message : '');
    } finally {
      setGenLoading(null);
    }
  };

  const genLiunian = async () => {
    setGenLoading('liunian');
    try {
      await api.post('/chart/reports/liunian', { year });
      load();
    } catch (e) {
      Alert.alert(t('chart.genFail'), e instanceof Error ? e.message : '');
    } finally {
      setGenLoading(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('chart.resultNav'), headerTintColor: colors.primary }} />
      <ReportGeneratingOverlay visible={genLoading !== null} />
      <Screen>
        {loading && !hub ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <SummaryCard
              label={t('chart.natalSummary')}
              report={hub?.natal ?? null}
              onDetail={() => hub?.natal && router.push(`/report/${hub.natal._id}?mode=detail`)}
              t={t}
            />

            <SummaryCard
              label={t('chart.daxian')}
              report={hub?.daxian ?? null}
              loading={genLoading === 'daxian'}
              onGenerate={genDaxian}
              onDetail={() => hub?.daxian && router.push(`/report/${hub.daxian._id}?mode=detail`)}
              extra={hub?.horoscope?.decadal ? t('chart.daxianRange', { range: hub.horoscope.decadal.range }) : undefined}
              t={t}
            />

            <SummaryCard
              label={t('chart.liunian', { year })}
              report={hub?.liunian ?? null}
              loading={genLoading === 'liunian'}
              onGenerate={genLiunian}
              onDetail={() => hub?.liunian && router.push(`/report/${hub.liunian._id}?mode=detail`)}
              extra={hub?.horoscope?.yearly ? t('chart.liunianFocus', { palace: hub.horoscope.yearly.palace }) : undefined}
              t={t}
            />

            <View style={styles.yearRow}>
              <Button title={t('chart.prevYear')} variant="secondary" onPress={() => setYear((y) => y - 1)} style={styles.yearBtn} />
              <Button title={t('chart.nextYear')} variant="secondary" onPress={() => setYear((y) => y + 1)} style={styles.yearBtn} />
            </View>

            <Button title={t('common.chatWithMirror')} onPress={() => router.push('/(tabs)/mirror')} style={{ marginTop: 8 }} />
            <Text style={styles.disclaimer}>{t('reportDetail.disclaimer')}</Text>
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  summaryCard: { marginBottom: spacing.md, alignSelf: 'stretch' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardLabel: { ...typography.title, fontSize: 17, flexShrink: 1 },
  badge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexShrink: 0 },
  badgeText: { ...typography.small, color: colors.primary, fontWeight: '700' },
  extra: { ...typography.small, color: colors.textSecondary, marginBottom: 8 },
  detailLink: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 4 },
  detailLinkText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  yearRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  yearBtn: { flex: 1 },
  disclaimer: { ...typography.small, textAlign: 'center', marginTop: 16, marginBottom: 32, color: colors.textSecondary },
});
