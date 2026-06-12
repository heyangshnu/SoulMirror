import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReportSummaryText } from '@/components/ui/ReportSummaryText';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Report = {
  _id: string;
  testType: string;
  title: string;
  summary?: string;
  headlineSummary?: string;
  portrait?: string;
  createdAt: string;
};

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [latestPlan, setLatestPlan] = useState<Report | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get<{ profile?: unknown } | null>('/chart/birth-profile')
        .then((res) => setHasProfile(!!res?.profile))
        .catch(() => setHasProfile(false));

      api
        .get<Report[]>('/reports')
        .then((list) => {
          const plan = list.find((r) => r.testType?.startsWith('plan_'));
          setLatestPlan(plan ?? null);
        })
        .catch(() => setLatestPlan(null));
    }, []),
  );

  const continueAsk = () => {
    if (!latestPlan) return;
    router.push({
      pathname: '/report/followup/[reportId]',
      params: { reportId: latestPlan._id },
    } as Href);
  };

  return (
    <Screen>
      <Text style={styles.brand}>{t('common.brand')}</Text>
      <Text style={styles.title}>{t('home.title')}</Text>
      <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

      {hasProfile === null ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : !hasProfile ? (
        <Card>
          <Text style={styles.cardBody}>{t('home.noProfile')}</Text>
          <Button title={t('common.goSetup')} onPress={() => router.push('/chart/setup' as Href)} style={{ marginTop: 12 }} />
        </Card>
      ) : (
        <>
          <Button title={t('home.startPlan')} onPress={() => router.push('/onboarding/intent' as Href)} />

          {latestPlan ? (
            <Card style={styles.latestCard}>
              <Text style={styles.latestLabel}>{t('home.latestPlan')}</Text>
              <Text style={styles.latestTitle}>{latestPlan.title}</Text>
              <ReportSummaryText style={styles.latestBody}>
                {latestPlan.headlineSummary || latestPlan.summary || latestPlan.portrait || ''}
              </ReportSummaryText>
              <View style={styles.latestActions}>
                <Button
                  title={t('home.viewPlan')}
                  variant="secondary"
                  onPress={() => router.push(`/report/${latestPlan._id}` as Href)}
                  style={styles.latestBtn}
                />
                <Button title={t('home.continueAsk')} onPress={continueAsk} style={styles.latestBtn} />
              </View>
            </Card>
          ) : (
            <Text style={styles.emptyHint}>{t('home.noPlanYet')}</Text>
          )}

          <Pressable onPress={() => router.push('/(tabs)/reports' as Href)}>
            <Text style={styles.link}>{t('home.allPlans')}</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { ...typography.small, color: colors.primary, marginTop: spacing.md, fontWeight: '600' },
  title: { ...typography.hero, marginTop: 8 },
  subtitle: { ...typography.caption, marginBottom: spacing.lg, lineHeight: 22 },
  cardBody: { ...typography.body, color: colors.textSecondary },
  latestCard: { marginTop: spacing.lg },
  latestLabel: { ...typography.caption, color: colors.primary, fontWeight: '600', marginBottom: 6 },
  latestTitle: { ...typography.title, fontSize: 17, marginBottom: 8 },
  latestBody: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  latestActions: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  latestBtn: { flex: 1 },
  emptyHint: { ...typography.caption, marginTop: spacing.lg, textAlign: 'center', color: colors.textSecondary },
  link: { ...typography.caption, color: colors.primary, fontWeight: '600', textAlign: 'center', marginTop: spacing.lg },
});
