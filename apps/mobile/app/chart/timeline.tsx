import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Horoscope = {
  currentAge: number;
  decadal: { range: string; palace: string; majorStars: string[] };
  yearly: { year: number; palace: string; majorStars: string[] };
};

export default function ChartTimelineScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [data, setData] = useState<Horoscope | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState<'daxian' | 'liunian' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Horoscope>(`/chart/horoscope?year=${year}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const genReport = async (type: 'daxian' | 'liunian') => {
    setReportLoading(type);
    try {
      const path = type === 'daxian' ? '/chart/reports/daxian' : '/chart/reports/liunian';
      const body = type === 'liunian' ? { year } : undefined;
      const report = await api.post<{ _id: string }>(path, body);
      router.push(`/report/${report._id}`);
    } catch (e) {
      Alert.alert(t('chart.genFail'), e instanceof Error ? e.message : t('chart.needSetup'));
    } finally {
      setReportLoading(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('chart.timelineNav'), headerTintColor: colors.primary }} />
      <Screen>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : !data ? (
          <View>
            <Text style={styles.empty}>{t('chart.needSetup')}</Text>
            <Button title={t('common.goSetup')} onPress={() => router.push('/chart/setup')} />
          </View>
        ) : (
          <>
            <Card>
              <Text style={styles.cardTitle}>{t('chart.currentAge', { age: data.currentAge })}</Text>
              <Text style={styles.cardBody}>{t('chart.daxianRangeShort', { range: data.decadal.range })}</Text>
              <Text style={styles.cardBody}>{t('chart.daxianPalace', { palace: data.decadal.palace })}</Text>
              <Text style={styles.cardSub}>
                {t('chart.majorStars', { stars: (data.decadal.majorStars || []).join('、') || '—' })}
              </Text>
              <Button
                title={t('chart.genDaxian')}
                onPress={() => genReport('daxian')}
                loading={reportLoading === 'daxian'}
                style={{ marginTop: 12 }}
              />
            </Card>

            <Card>
              <Text style={styles.cardTitle}>{t('chart.liunianYear', { year })}</Text>
              <Text style={styles.cardBody}>{t('chart.liunianPalace', { palace: data.yearly.palace })}</Text>
              <Text style={styles.cardSub}>
                {t('chart.majorStars', { stars: (data.yearly.majorStars || []).join('、') || '—' })}
              </Text>
              <View style={styles.row}>
                <Button title={t('chart.prevYearBtn')} variant="secondary" onPress={() => setYear((y) => y - 1)} style={styles.yearBtn} />
                <Button title={t('chart.nextYearBtn')} variant="secondary" onPress={() => setYear((y) => y + 1)} style={styles.yearBtn} />
              </View>
              <Button
                title={t('chart.genLiunian', { year })}
                onPress={() => genReport('liunian')}
                loading={reportLoading === 'liunian'}
                style={{ marginTop: 12 }}
              />
            </Card>
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  empty: { ...typography.body, textAlign: 'center', marginBottom: 16 },
  cardTitle: { ...typography.title, marginBottom: 8 },
  cardBody: { ...typography.body, color: colors.textSecondary },
  cardSub: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  yearBtn: { flex: 1 },
});
