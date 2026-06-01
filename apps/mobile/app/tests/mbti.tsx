import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Question = { id: number; text: string };

export default function MbtiTestScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<{ questions: Question[] }>('/tests/mbti/questions')
      .then((r) => setQuestions(r.questions))
      .catch(() => Alert.alert('加载失败', '请确认已登录且后端已启动'));
  }, []);

  const q = questions[index];
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;

  const select = (value: number) => {
    if (!q) return;
    setAnswers((a) => ({ ...a, [q.id]: value }));
    if (index < questions.length - 1) setIndex(index + 1);
  };

  const submit = async () => {
    const payload = Object.entries(answers).map(([questionId, value]) => ({
      questionId: Number(questionId),
      value,
    }));
    if (payload.length < questions.length) {
      Alert.alert('提示', '请完成全部题目');
      return;
    }
    setLoading(true);
    try {
      const report = await api.post<{ _id: string }>('/tests/mbti/submit', { answers: payload });
      router.replace(`/report/${report._id}`);
    } catch (e) {
      Alert.alert('提交失败', e instanceof Error ? e.message : '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!q) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'MBTI', headerTintColor: colors.primary }} />
        <Screen><Text>加载题目中…</Text></Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'MBTI', headerTintColor: colors.primary }} />
      <Screen>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {index + 1} / {questions.length}
        </Text>
        <Text style={styles.question}>{q.text}</Text>
        <Text style={styles.scale}>非常不同意 ← → 非常同意</Text>
        <View style={styles.options}>
          {[1, 2, 3, 4, 5].map((v) => (
            <Pressable
              key={v}
              style={[styles.option, answers[q.id] === v && styles.optionActive]}
              onPress={() => select(v)}
            >
              <Text style={[styles.optionText, answers[q.id] === v && styles.optionTextActive]}>{v}</Text>
            </Pressable>
          ))}
        </View>
        {index > 0 && (
          <Button title="上一题" variant="ghost" onPress={() => setIndex(index - 1)} />
        )}
        {index === questions.length - 1 && answers[q.id] && (
          <Button title="查看报告" onPress={submit} loading={loading} style={{ marginTop: 16 }} />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  progressBg: { height: 6, backgroundColor: colors.primaryMuted, borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { ...typography.small, marginBottom: 24 },
  question: { ...typography.title, fontSize: 18, lineHeight: 28, marginBottom: 16 },
  scale: { ...typography.small, marginBottom: 24 },
  options: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  option: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  optionText: { fontSize: 18, fontWeight: '600', color: colors.textSecondary },
  optionTextActive: { color: colors.primary },
});
