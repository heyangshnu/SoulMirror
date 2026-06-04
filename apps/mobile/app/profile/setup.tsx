import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTranslation, toneLabel } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

const AGE_OPTIONS = ['18-24', '25-30', '31-40', '41+'];
const TONE_IDS = ['gentle', 'rational', 'humorous'] as const;

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [ageRange, setAgeRange] = useState('');
  const [occupation, setOccupation] = useState('');
  const [concern, setConcern] = useState('');
  const [botTone, setBotTone] = useState('gentle');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await api.put('/user/profile', { ageRange, occupation, concern, botTone });
      router.replace('/(tabs)/explore');
    } catch (e) {
      Alert.alert(t('persona.saveFail'), e instanceof Error ? e.message : t('common.retryLater'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('persona.nav'), headerTintColor: colors.primary }} />
      <Screen keyboardAvoid>
        <Text style={styles.desc}>{t('persona.subtitle')}</Text>
        <Text style={styles.label}>{t('persona.ageRange')}</Text>
        <View style={styles.chips}>
          {AGE_OPTIONS.map((a) => (
            <Pressable key={a} style={[styles.chip, ageRange === a && styles.chipActive]} onPress={() => setAgeRange(a)}>
              <Text style={[styles.chipText, ageRange === a && styles.chipTextActive]}>{a}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{t('persona.occupation')}</Text>
        <TextInput style={styles.input} placeholder={t('persona.occupationPh')} value={occupation} onChangeText={setOccupation} />
        <Text style={styles.label}>{t('persona.concern')}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder={t('persona.concernPh')}
          value={concern}
          onChangeText={setConcern}
          multiline
        />
        <Text style={styles.label}>{t('persona.botTone')}</Text>
        <View style={styles.chips}>
          {TONE_IDS.map((id) => (
            <Pressable key={id} style={[styles.chip, botTone === id && styles.chipActive]} onPress={() => setBotTone(id)}>
              <Text style={[styles.chipText, botTone === id && styles.chipTextActive]}>{toneLabel(t, id)}</Text>
            </Pressable>
          ))}
        </View>
        <Button title={t('persona.done')} onPress={save} loading={loading} style={{ marginTop: 24 }} />
        <Button title={t('persona.later')} variant="ghost" onPress={() => router.replace('/(tabs)/explore')} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { ...typography.caption, marginBottom: spacing.lg },
  label: { ...typography.caption, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: colors.backgroundSecondary, borderRadius: 16, padding: 16, fontSize: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});
