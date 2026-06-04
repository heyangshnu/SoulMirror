import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

const DOMAINS = ['love', 'career', 'health', 'general'] as const;
const CARD_KEYS = ['past', 'present', 'advice'] as const;

function domainLocaleKey(id: string) {
  return id === 'health' ? 'wellness' : id;
}

export default function TarotTestScreen() {
  const { t } = useTranslation();
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
      Alert.alert(t('tests.drawFail'), e instanceof Error ? e.message : t('common.retryLater'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('tests.tarotNav'), headerTintColor: colors.primary }} />
      <Screen>
        <Text style={styles.desc}>{t('tests.tarotDesc')}</Text>
        <View style={styles.grid}>
          {DOMAINS.map((d) => (
            <Pressable
              key={d}
              style={[styles.chip, domain === d && styles.chipActive]}
              onPress={() => setDomain(d)}
            >
              <Text style={[styles.chipText, domain === d && styles.chipTextActive]}>
                {t(`tests.domains.${domainLocaleKey(d)}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.cards}>
          {CARD_KEYS.map((key) => (
            <View key={key} style={styles.card}>
              <Text style={styles.cardLabel}>{t(`tests.${key}`)}</Text>
              <Text style={styles.cardIcon}>✦</Text>
            </View>
          ))}
        </View>
        <Button title={t('tests.draw')} onPress={draw} loading={loading} style={{ marginTop: 32 }} />
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
