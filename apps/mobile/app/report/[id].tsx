import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PlanCardView } from '@/components/plan/PlanCardView';
import { RealContextPanel } from '@/components/plan/RealContextPanel';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { exportReportPdf } from '@/lib/export-pdf';
import { colors, spacing, typography } from '@/theme/tokens';

type PlanReport = {
  title: string;
  portrait?: string;
  stage?: string;
  plans?: { id: string; title: string; body: string; actions: string[]; phrases?: string[] }[];
  followUpQuestions?: string[];
  disclaimer?: string;
  coverageLevel?: string;
  sections?: { title: string; content: string }[];
  summary?: string;
  headlineSummary?: string;
  testType?: string;
  themeLabel?: string;
};

const RELATION_TYPES = new Set(['plan_synastry', 'plan_child_environment', 'plan_family_system']);

export default function ReportDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<PlanReport | null>(null);
  const [exporting, setExporting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (id) {
      api
        .get<PlanReport>(`/reports/${id}`)
        .then(setReport)
        .catch(() => api.get<PlanReport>(`/analysis/reports/${id}`).then(setReport).catch(() => setReport(null)));
    }
  }, [id]);

  const openFollowUp = (question?: string) => {
    router.push({
      pathname: '/(tabs)/chat',
      params: { prefill: question?.trim() || '我想继续聊聊这个方案' },
    } as Href);
  };

  if (!report) {
    return (
      <>
        <Stack.Screen options={{ title: t('planReport.nav') }} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </>
    );
  }

  const isPlan = (report.plans?.length ?? 0) > 0;
  const isRelationPlan = RELATION_TYPES.has(report.testType ?? '');

  const exportPdf = async () => {
    if (!id || exporting) return;
    setExporting(true);
    try {
      await exportReportPdf(id);
    } catch (e) {
      Alert.alert(t('exportPdf.fail'), e instanceof Error ? e.message : t('common.retryLater'));
    } finally {
      setExporting(false);
    }
  };

  if (!isPlan) {
    return (
      <>
        <Stack.Screen options={{ title: report.title }} />
        <Screen>
          {report.sections?.map((s, i) => (
            <Card key={i}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <Text style={styles.sectionBody}>{s.content}</Text>
            </Card>
          ))}
          <Text style={styles.disclaimer}>{t('planReport.disclaimer')}</Text>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: report.title, headerTintColor: colors.primary }} />
      <Screen>
        <ScrollView ref={scrollRef}>
          <Card style={styles.portraitCard}>
            <Text style={styles.sectionLabel}>{t('planReport.portrait')}</Text>
            <Text style={styles.portrait}>{report.portrait}</Text>
          </Card>

          {report.stage ? (
            <Card style={styles.stageCard}>
              <Text style={styles.sectionLabel}>{t('planReport.stage')}</Text>
              <Text style={styles.stage}>{report.stage}</Text>
            </Card>
          ) : null}

          {report.coverageLevel === 'partial' ? (
            <Text style={styles.partialHint}>{t('planReport.partialHint')}</Text>
          ) : null}

          <RealContextPanel />

          <Text style={styles.sectionLabel}>{t('planReport.plans')}</Text>
          {report.plans!.map((card) => (
            <PlanCardView
              key={card.id}
              card={card}
              followUpLabel={t('planReport.askMore')}
              onFollowUp={(q, cardId) => openFollowUp(q, cardId)}
            />
          ))}

          {isRelationPlan ? (
            <Card style={styles.relationTools}>
              <Text style={styles.sectionLabel}>{t('planReport.relationTools')}</Text>
              <Text style={styles.relationHint}>{t('planReport.chatUploadHint')}</Text>
              <Button
                title={t('chatUpload.nav')}
                variant="secondary"
                onPress={() => router.push('/analysis/chat-upload' as Href)}
              />
            </Card>
          ) : null}

          <View style={styles.chips}>
            {(report.followUpQuestions ?? []).map((q) => (
              <Pressable key={q} onPress={() => openFollowUp(q)} style={styles.chip}>
                <Text style={styles.chipText}>{q}</Text>
              </Pressable>
            ))}
          </View>

          <Button title={t('home.continueAsk')} onPress={() => openFollowUp()} style={{ marginTop: 8 }} />

          <Button
            title={exporting ? t('exportPdf.exporting') : t('exportPdf.export')}
            variant="secondary"
            onPress={exportPdf}
            disabled={exporting}
            style={{ marginTop: 12 }}
          />
          <Text style={styles.disclaimer}>{report.disclaimer ?? t('planReport.disclaimer')}</Text>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  portraitCard: { backgroundColor: colors.primaryMuted, marginBottom: spacing.md },
  stageCard: { marginBottom: spacing.md },
  sectionLabel: { ...typography.title, fontSize: 15, color: colors.primary, marginBottom: 8, marginTop: 4 },
  portrait: { ...typography.body, fontSize: 17, lineHeight: 26 },
  stage: { ...typography.body, lineHeight: 24 },
  partialHint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md, fontStyle: 'italic' },
  relationTools: { marginBottom: spacing.md },
  relationHint: { ...typography.caption, marginBottom: spacing.sm, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: spacing.md },
  chip: { backgroundColor: colors.primaryMuted, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  chipText: { ...typography.caption, color: colors.primary },
  sectionTitle: { ...typography.title, fontSize: 16, marginBottom: 8 },
  sectionBody: { ...typography.body, lineHeight: 24 },
  disclaimer: { ...typography.small, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.xl, lineHeight: 20 },
});
