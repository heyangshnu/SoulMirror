import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReportSummaryText } from '@/components/ui/ReportSummaryText';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Report = {
  title: string;
  summary: string;
  testType?: string;
  themeLabel?: string;
  headlineSummary?: string;
  score?: number;
  scoreLabel?: string;
  sections: { title: string; content: string }[];
};

export default function ReportDetailScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const isDetailOnly = mode === 'detail';

  useEffect(() => {
    if (id) api.get<Report>(`/reports/${id}`).then(setReport).catch(() => setReport(null));
  }, [id]);

  if (!report) {
    return (
      <>
        <Stack.Screen options={{ title: '报告' }} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </>
    );
  }

  const isZiwei = report.testType?.startsWith('ziwei');
  const keyword = isZiwei ? report.themeLabel : report.scoreLabel;
  const headline = report.headlineSummary ?? report.summary;

  return (
    <>
      <Stack.Screen
        options={{
          title: isDetailOnly ? '完整解读' : report.title,
          headerTintColor: colors.primary,
        }}
      />
      <Screen>
        {!isDetailOnly && (
          <Card style={styles.headlineCard}>
            {keyword ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{keyword}</Text>
              </View>
            ) : null}
            <Text style={styles.headlineTitle}>一句话总结</Text>
            <ReportSummaryText variant="primary">{headline}</ReportSummaryText>
          </Card>
        )}

        <Text style={styles.detailTitle}>{isDetailOnly ? '详细解读' : '展开阅读'}</Text>

        {report.sections.map((s, i) => (
          <Card key={i}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.content}</Text>
          </Card>
        ))}

        {!isZiwei && report.score != null ? (
          <Text style={styles.legacyScore}>参考指数 {report.score}</Text>
        ) : null}

        {isZiwei && isDetailOnly ? (
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>← 返回总结页</Text>
          </Pressable>
        ) : null}

        <Button title="与心镜聊聊" onPress={() => router.push('/(tabs)/mirror')} style={{ marginTop: 8 }} />
        <Text style={styles.disclaimer}>本报告仅供自我探索与娱乐参考，不构成专业诊断或决策依据。</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headlineCard: { marginBottom: spacing.lg, backgroundColor: colors.primaryMuted, alignSelf: 'stretch' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: { ...typography.small, color: colors.primary, fontWeight: '700' },
  headlineTitle: { ...typography.caption, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  detailTitle: { ...typography.title, fontSize: 17, marginBottom: spacing.sm },
  sectionTitle: { ...typography.title, fontSize: 17, marginBottom: 10 },
  sectionBody: { ...typography.body, fontSize: 15, color: colors.textSecondary, lineHeight: 24 },
  legacyScore: { ...typography.small, color: colors.textSecondary, textAlign: 'center', marginTop: 8, opacity: 0.7 },
  backLink: { ...typography.caption, color: colors.primary, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  disclaimer: { ...typography.small, textAlign: 'center', marginTop: 24, marginBottom: 32 },
});
