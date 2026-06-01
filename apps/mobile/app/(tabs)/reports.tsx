import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Report = {
  _id: string;
  testType: string;
  title: string;
  summary: string;
  score?: number;
  createdAt: string;
};

export default function ReportsScreen() {
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

  return (
    <Screen>
      <Text style={styles.title}>我的报告</Text>
      <Text style={styles.subtitle}>每一次探索，都是更了解自己的一步</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : reports.length === 0 ? (
        <Card>
          <Text style={styles.empty}>还没有报告，去「探索」完成第一次测试吧</Text>
        </Card>
      ) : (
        reports.map((r) => (
          <Pressable key={r._id} onPress={() => router.push(`/report/${r._id}`)}>
            <Card>
              <View style={styles.row}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{r.testType.toUpperCase()}</Text>
                </View>
                {r.score != null && <Text style={styles.score}>{r.score}</Text>}
              </View>
              <Text style={styles.cardTitle}>{r.title}</Text>
              <Text style={styles.summary} numberOfLines={2}>
                {r.summary}
              </Text>
              <Text style={styles.date}>{new Date(r.createdAt).toLocaleDateString('zh-CN')}</Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md },
  subtitle: { ...typography.caption, marginBottom: spacing.lg },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badge: { backgroundColor: colors.primaryMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  score: { fontSize: 22, fontWeight: '700', color: colors.primary },
  cardTitle: { ...typography.title, fontSize: 17 },
  summary: { ...typography.caption, marginTop: 6 },
  date: { ...typography.small, marginTop: 10 },
});
