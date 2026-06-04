import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export default function VoiceDiaryScreen() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [focus, setFocus] = useState('');
  const [entries, setEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadContext = async () => {
    const ctx = await api.get<{ voiceDiaryEntries?: string[]; weeklyFocus?: string }>('/chart/life-context');
    setEntries(ctx.voiceDiaryEntries ?? []);
    if (ctx.weeklyFocus) setFocus(ctx.weeklyFocus);
  };

  useEffect(() => {
    loadContext().catch(() => {});
  }, []);

  const saveDiary = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await api.post('/chart/voice-diary', { text: text.trim() });
      setText('');
      await loadContext();
      Alert.alert(t('chart.saved'), t('chart.diarySavedHint'));
    } catch (e) {
      Alert.alert(t('persona.saveFail'), e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  };

  const saveFocus = async () => {
    if (!focus.trim()) return;
    await api.put('/chart/weekly-focus', { focus: focus.trim() });
    Alert.alert(t('chart.focusUpdated'));
  };

  const syncChat = async () => {
    setLoading(true);
    try {
      await api.post('/chart/chat-summary');
      Alert.alert(t('chart.synced'), t('chart.chatSyncedHint'));
    } catch (e) {
      Alert.alert(t('chart.syncFail'), e instanceof Error ? e.message : t('chart.chatFirst'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('chart.voiceNav'), headerTintColor: colors.primary }} />
      <Screen keyboardAvoid>
        <Text style={styles.desc}>{t('chart.voiceDesc')}</Text>

        <Card>
          <Text style={styles.label}>{t('chart.todayDiary')}</Text>
          <TextInput
            style={styles.area}
            multiline
            placeholder={t('chart.diaryPh')}
            value={text}
            onChangeText={setText}
          />
          <Button title={t('chart.saveDiary')} onPress={saveDiary} loading={loading} />
        </Card>

        <Card>
          <Text style={styles.label}>{t('chart.weeklyFocus')}</Text>
          <TextInput style={styles.input} value={focus} onChangeText={setFocus} placeholder={t('chart.weeklyPh')} />
          <Button title={t('chart.updateFocus')} variant="secondary" onPress={saveFocus} />
        </Card>

        <Button title={t('chart.syncChat')} variant="secondary" onPress={syncChat} loading={loading} />

        {entries.length > 0 && (
          <Card>
            <Text style={styles.label}>{t('chart.recentDiary')}</Text>
            {entries.slice(-5).reverse().map((e, i) => (
              <Text key={i} style={styles.entry}>· {e}</Text>
            ))}
          </Card>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { ...typography.caption, marginBottom: spacing.md },
  label: { ...typography.caption, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 8 },
  area: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: 'top', marginBottom: 8 },
  entry: { ...typography.body, color: colors.textSecondary, marginBottom: 6 },
});
