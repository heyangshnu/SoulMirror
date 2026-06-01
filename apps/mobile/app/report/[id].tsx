import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Report = {
  title: string;
  summary: string;
  score?: number;
  scoreLabel?: string;
  sections: { title: string; content: string }[];
};

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);

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

  return (
    <>
      <Stack.Screen options={{ title: report.title, headerTintColor: colors.primary }} />
      <Screen>
        <View style={styles.hero}>
          <ProgressRing score={report.score ?? 80} label={report.scoreLabel} />
          <Text style={styles.summary}>{report.summary}</Text>
        </View>
        {report.sections.map((s, i) => (
          <Card key={i}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.content}</Text>
          </Card>
        ))}
        <Button title="与心镜聊聊" onPress={() => router.push('/(tabs)/mirror')} style={{ marginTop: 8 }} />
        <Text style={styles.disclaimer}>本报告仅供自我探索与娱乐参考，不构成专业诊断或决策依据。</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  summary: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
  sectionTitle: { ...typography.title, fontSize: 17, marginBottom: 10 },
  sectionBody: { ...typography.body, fontSize: 15, color: colors.textSecondary, lineHeight: 24 },
  disclaimer: { ...typography.small, textAlign: 'center', marginTop: 24, marginBottom: 32 },
});
