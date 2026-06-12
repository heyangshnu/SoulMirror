import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FollowUpChatView } from '@/components/plan/FollowUpChatView';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors } from '@/theme/tokens';

type PlanReport = {
  portrait?: string;
  summary?: string;
  followUpQuestions?: string[];
};

export default function ReportFollowUpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { reportId, q, planCardId } = useLocalSearchParams<{
    reportId: string;
    q?: string;
    planCardId?: string;
  }>();
  const [report, setReport] = useState<PlanReport | null>(null);

  useEffect(() => {
    if (!reportId) return;
    api
      .get<PlanReport>(`/reports/${reportId}`)
      .then(setReport)
      .catch(() => api.get<PlanReport>(`/analysis/reports/${reportId}`).then(setReport).catch(() => setReport(null)));
  }, [reportId]);

  const backToReport = () => {
    if (reportId) router.replace(`/report/${reportId}`);
    else router.back();
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: t('planReport.followUpTitle'),
          headerTintColor: colors.primary,
          headerBackTitle: t('planReport.backToReport'),
          headerLeft: () => (
            <Pressable onPress={backToReport} hitSlop={12} style={{ paddingHorizontal: 8 }}>
              <Text style={{ color: colors.primary, fontSize: 17 }}>‹ {t('planReport.backToReport')}</Text>
            </Pressable>
          ),
        }}
      />
      <FollowUpChatView
        planContext={report?.portrait ?? report?.summary}
        planCardId={typeof planCardId === 'string' ? planCardId : undefined}
        pendingQuestion={typeof q === 'string' ? q : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
