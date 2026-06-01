import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

const DOMAINS = [
  { id: 'love', label: '感情' },
  { id: 'career', label: '事业' },
  { id: 'health', label: '身心' },
  { id: 'general', label: '综合' },
] as const;

export default function TarotTestScreen() {
  const router = useRouter();
  const [domain, setDomain] = useState<string>('general');
  const [loading, setLoading] = useState(false);

  const draw = async () => {
    setLoading(true);
    try {
      const report = await api.post<{ _id: string }>('/tests/tarot/draw', {
        domain,
        seed: Date.now(),
      });
      router.replace(`/report/${report._id}`);
    } catch (e) {
      Alert.alert('抽牌失败', e instanceof Error ? e.message : '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '塔罗占卜', headerTintColor: colors.primary }} />
      <Screen>
        <Text style={styles.desc}>静心选择你关注的领域，抽取三张牌：过去 · 现在 · 建议</Text>
        <View style={styles.grid}>
          {DOMAINS.map((d) => (
            <Pressable
              key={d.id}
              style={[styles.chip, domain === d.id && styles.chipActive]}
              onPress={() => setDomain(d.id)}
            >
              <Text style={[styles.chipText, domain === d.id && styles.chipTextActive]}>{d.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.cards}>
          {['过去', '现在', '建议'].map((label) => (
            <View key={label} style={styles.card}>
              <Text style={styles.cardLabel}>{label}</Text>
              <Text style={styles.cardIcon}>✦</Text>
            </View>
          ))}
        </View>
        <Button title="洗牌并抽牌" onPress={draw} loading={loading} style={{ marginTop: 32 }} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { ...typography.caption, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  chip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.body, fontSize: 15 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  cards: { flexDirection: 'row', justifyContent: 'space-between' },
  card: {
    width: '30%',
    aspectRatio: 0.65,
    backgroundColor: colors.primaryMuted,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  cardLabel: { ...typography.small, marginBottom: 8 },
  cardIcon: { fontSize: 32, color: colors.primary },
});
