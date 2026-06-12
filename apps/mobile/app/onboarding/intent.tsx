import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter, type Href } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { ReportGeneratingOverlay } from '@/components/ui/ReportGeneratingOverlay';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

const CONCERNS = ['recent_years', 'career', 'marriage', 'child'] as const;
type Concern = (typeof CONCERNS)[number];

type Relation = { _id: string; relationType: string };

export default function IntentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [concern, setConcern] = useState<Concern>('recent_years');
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      if (brief.trim()) {
        await api.put('/chart/real-context', {
          freeText: brief.trim(),
          currentConflict: brief.trim(),
        });
      }

      let report: { _id: string };

      if (concern === 'recent_years') {
        report = await api.post('/analysis/recent-years', {});
      } else if (concern === 'career') {
        report = await api.post('/analysis/natal', { topic: 'self_profile' });
      } else {
        const relations = await api.get<Relation[]>('/chart/relations');
        const targetType = concern === 'marriage' ? 'spouse' : 'child';
        const match = relations.find((r) => r.relationType === targetType);
        if (!match) {
          Alert.alert(t('common.ok'), t('topic.relationHint'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('family.manage'), onPress: () => router.push('/chart/relations' as Href) },
          ]);
          return;
        }
        const path = concern === 'child' ? '/analysis/child' : '/analysis/synastry';
        report = await api.post(path, { relationId: match._id });
      }

      router.replace(`/report/${report._id}`);
    } catch (e) {
      Alert.alert(t('chart.reportFail'), e instanceof Error ? e.message : t('common.retryLater'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('intent.nav'), headerTintColor: colors.primary }} />
      <ReportGeneratingOverlay visible={loading} />
      <Screen keyboardAvoid>
        <Text style={styles.hero}>{t('intent.hero')}</Text>
        <Text style={styles.sub}>{t('intent.sub')}</Text>

        <Text style={styles.q}>{t('intent.q2')}</Text>
        {CONCERNS.map((c) => (
          <Button
            key={c}
            title={t(`intent.concern_${c}`)}
            variant={concern === c ? 'primary' : 'secondary'}
            onPress={() => setConcern(c)}
            style={styles.option}
          />
        ))}

        <Text style={styles.q}>{t('intent.briefLabel')}</Text>
        <TextInput
          style={styles.input}
          value={brief}
          onChangeText={setBrief}
          placeholder={t('intent.briefPh')}
          multiline
          textAlignVertical="top"
        />

        <Button title={t('topic.generate')} onPress={generate} disabled={loading} style={{ marginTop: spacing.lg }} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { ...typography.hero, marginTop: spacing.md, fontSize: 22 },
  sub: { ...typography.caption, marginBottom: spacing.md, lineHeight: 22 },
  q: { ...typography.title, fontSize: 15, marginTop: spacing.md, marginBottom: 8 },
  option: { marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
    backgroundColor: colors.background,
    ...typography.body,
  },
});
