import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export default function BaziTestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [birthDate, setBirthDate] = useState('1995-06-15');
  const [birthTime, setBirthTime] = useState('10:30');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [birthPlace, setBirthPlace] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const report = await api.post<{ _id: string }>('/tests/bazi/submit', {
        birthDate,
        birthTime,
        gender,
        calendar: 'solar',
        birthPlace: birthPlace || undefined,
      });
      router.replace(`/report/${report._id}`);
    } catch (e) {
      Alert.alert(t('tests.genFail'), e instanceof Error ? e.message : t('tests.checkBackend'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('tests.baziNav'), headerTintColor: colors.primary }} />
      <Screen>
        <Text style={styles.desc}>{t('tests.baziDesc')}</Text>
        <Text style={styles.label}>{t('tests.birthDate')}</Text>
        <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} />
        <Text style={styles.label}>{t('tests.birthTime')}</Text>
        <TextInput style={styles.input} value={birthTime} onChangeText={setBirthTime} />
        <Text style={styles.label}>{t('tests.gender')}</Text>
        <View style={styles.row}>
          <Button title={t('common.female')} variant={gender === 'female' ? 'primary' : 'secondary'} onPress={() => setGender('female')} style={styles.half} />
          <Button title={t('common.male')} variant={gender === 'male' ? 'primary' : 'secondary'} onPress={() => setGender('male')} style={styles.half} />
        </View>
        <Text style={styles.label}>{t('tests.birthPlaceOptional')}</Text>
        <TextInput style={styles.input} placeholder={t('tests.birthPlacePh')} value={birthPlace} onChangeText={setBirthPlace} />
        <Button title={t('tests.genBazi')} onPress={submit} loading={loading} style={{ marginTop: 24 }} />
        <Text style={styles.disclaimer}>{t('reportDetail.disclaimer')}</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { ...typography.caption, marginBottom: spacing.lg },
  label: { ...typography.caption, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: colors.backgroundSecondary, borderRadius: 16, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  disclaimer: { ...typography.small, marginTop: 16, textAlign: 'center' },
});
