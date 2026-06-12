import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReportGeneratingOverlay } from '@/components/ui/ReportGeneratingOverlay';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export default function ChartSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [birthDate, setBirthDate] = useState('1995-06-15');
  const [birthTime, setBirthTime] = useState('12:00');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [birthPlace, setBirthPlace] = useState('上海');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [currentState, setCurrentState] = useState('');
  const [focusDirection, setFocusDirection] = useState('');
  const [loading, setLoading] = useState(false);

  const saveAndReport = async () => {
    setLoading(true);
    try {
      await api.put('/chart/birth-profile', {
        birthDate,
        birthTime: timeUnknown ? '12:00' : birthTime,
        gender,
        calendar,
        birthPlace: birthPlace || undefined,
        timeUnknown,
        currentState: currentState.trim() || undefined,
        focusDirection: focusDirection.trim() || undefined,
      });
      router.replace('/(tabs)/explore');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('chart.checkNetwork');
      Alert.alert(t('chart.saveBirthFail'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('chart.setupNav'), headerTintColor: colors.primary }} />
      <ReportGeneratingOverlay visible={loading} />
      <Screen keyboardAvoid>
        <Text style={styles.desc}>{t('chart.setupSubtitle')}</Text>

        <Text style={styles.sectionTitle}>{t('chart.birthInfo')}</Text>

        <Text style={styles.label}>{t('chart.calendar')}</Text>
        <View style={styles.row}>
          <Button title={t('common.solar')} variant={calendar === 'solar' ? 'primary' : 'secondary'} onPress={() => setCalendar('solar')} style={styles.half} />
          <Button title={t('common.lunar')} variant={calendar === 'lunar' ? 'primary' : 'secondary'} onPress={() => setCalendar('lunar')} style={styles.half} />
        </View>

        <Text style={styles.label}>{t('chart.birthDate')}</Text>
        <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} />

        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('chart.timeUnknown')}</Text>
          <Switch value={timeUnknown} onValueChange={setTimeUnknown} />
        </View>
        {timeUnknown ? (
          <Text style={styles.warn}>{t('chart.timeUnknownWarn')}</Text>
        ) : (
          <>
            <Text style={styles.label}>{t('chart.birthTime')}</Text>
            <TextInput style={styles.input} value={birthTime} onChangeText={setBirthTime} />
          </>
        )}

        <Text style={styles.label}>{t('chart.gender')}</Text>
        <View style={styles.row}>
          <Button title={t('common.female')} variant={gender === 'female' ? 'primary' : 'secondary'} onPress={() => setGender('female')} style={styles.half} />
          <Button title={t('common.male')} variant={gender === 'male' ? 'primary' : 'secondary'} onPress={() => setGender('male')} style={styles.half} />
        </View>

        <Text style={styles.label}>{t('chart.birthPlace')}</Text>
        <TextInput style={styles.input} placeholder={t('chart.birthPlacePh')} value={birthPlace} onChangeText={setBirthPlace} />

        <Text style={styles.sectionTitle}>{t('chart.personalBg')}</Text>
        <Text style={styles.hint}>{t('chart.personalBgHint')}</Text>

        <Card style={styles.personalCard}>
          <Text style={styles.label}>{t('chart.currentState')}</Text>
          <TextInput
            style={styles.area}
            multiline
            placeholder={t('chart.currentStatePh')}
            value={currentState}
            onChangeText={setCurrentState}
            blurOnSubmit={false}
          />
          <Text style={styles.label}>{t('chart.focus')}</Text>
          <TextInput
            style={styles.area}
            multiline
            placeholder={t('chart.focusPh')}
            value={focusDirection}
            onChangeText={setFocusDirection}
            blurOnSubmit={false}
          />
        </Card>

        <Button title={t('chart.generate')} onPress={saveAndReport} loading={loading} style={{ marginTop: 16 }} />
        <Text style={styles.disclaimer}>{t('chart.setupDisclaimer')}</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { ...typography.caption, marginBottom: spacing.md },
  sectionTitle: { ...typography.title, fontSize: 17, marginTop: spacing.md, marginBottom: 8 },
  hint: { ...typography.small, color: colors.textSecondary, marginBottom: 8 },
  label: { ...typography.caption, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  area: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 88,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 4,
  },
  personalCard: { marginBottom: 0 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  warn: { ...typography.small, color: '#B45309', marginTop: 8, lineHeight: 20 },
  disclaimer: { ...typography.small, textAlign: 'center', marginTop: 24, marginBottom: 32, color: colors.textSecondary },
});
