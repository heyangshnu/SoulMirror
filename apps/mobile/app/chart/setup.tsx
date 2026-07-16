import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type BirthProfile = {
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  calendar: 'solar' | 'lunar';
  birthPlace?: string;
  timeUnknown?: boolean;
  currentState?: string;
  focusDirection?: string;
};

export default function ChartSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ first?: string }>();
  const [isFirstTime, setIsFirstTime] = useState(params.first === '1');
  const [loaded, setLoaded] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [birthPlace, setBirthPlace] = useState('');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [currentState, setCurrentState] = useState('');
  const [focusDirection, setFocusDirection] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api
        .get<{ profile?: BirthProfile } | null>('/chart/birth-profile')
        .then((res) => {
          if (cancelled) return;
          const profile = res?.profile;
          if (profile) {
            setIsFirstTime(false);
            setBirthDate(profile.birthDate ?? '');
            setBirthTime(profile.birthTime ?? '');
            setGender(profile.gender ?? 'female');
            setCalendar(profile.calendar ?? 'solar');
            setBirthPlace(profile.birthPlace ?? '');
            setTimeUnknown(!!profile.timeUnknown);
            setCurrentState(profile.currentState ?? '');
            setFocusDirection(profile.focusDirection ?? '');
          } else {
            setIsFirstTime(true);
          }
          setLoaded(true);
        })
        .catch(() => {
          if (!cancelled) {
            setIsFirstTime(params.first === '1');
            setLoaded(true);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [params.first]),
  );

  const saveProfile = async () => {
    if (!birthDate.trim()) {
      Alert.alert(t('common.ok'), t('chart.birthDateRequired'));
      return;
    }

    setLoading(true);
    try {
      await api.put('/chart/birth-profile', {
        birthDate: birthDate.trim(),
        birthTime: timeUnknown ? '12:00' : birthTime.trim() || '12:00',
        gender,
        calendar,
        birthPlace: birthPlace.trim() || undefined,
        timeUnknown,
        currentState: isFirstTime ? undefined : currentState.trim() || undefined,
        focusDirection: isFirstTime ? undefined : focusDirection.trim() || undefined,
      });
      router.replace('/(tabs)/today' as Href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('chart.checkNetwork');
      Alert.alert(t('chart.saveBirthFail'), msg);
    } finally {
      setLoading(false);
    }
  };

  const navTitle = isFirstTime ? t('chart.firstSetupNav') : t('chart.setupNav');
  const subtitle = isFirstTime ? t('chart.firstSetupSubtitle') : t('chart.setupSubtitle');
  const actionLabel = isFirstTime ? t('chart.saveAndContinue') : t('chart.saveBirth');

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: navTitle, headerTintColor: colors.primary }} />
      <Screen keyboardAvoid>
        <Text style={styles.desc}>{subtitle}</Text>

        <Text style={styles.sectionTitle}>{t('chart.birthInfo')}</Text>

        <Text style={styles.label}>{t('chart.calendar')}</Text>
        <View style={styles.row}>
          <Button title={t('common.solar')} variant={calendar === 'solar' ? 'primary' : 'secondary'} onPress={() => setCalendar('solar')} style={styles.half} />
          <Button title={t('common.lunar')} variant={calendar === 'lunar' ? 'primary' : 'secondary'} onPress={() => setCalendar('lunar')} style={styles.half} />
        </View>

        <Text style={styles.label}>{t('chart.birthDate')}</Text>
        <TextInput
          style={styles.input}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="1990-01-01"
          placeholderTextColor={colors.textSecondary}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>{t('chart.timeUnknown')}</Text>
          <Switch value={timeUnknown} onValueChange={setTimeUnknown} />
        </View>
        {timeUnknown ? (
          <Text style={styles.warn}>{t('chart.timeUnknownWarn')}</Text>
        ) : (
          <>
            <Text style={styles.label}>{t('chart.birthTime')}</Text>
            <TextInput
              style={styles.input}
              value={birthTime}
              onChangeText={setBirthTime}
              placeholder="14:30"
              placeholderTextColor={colors.textSecondary}
            />
          </>
        )}

        <Text style={styles.label}>{t('chart.gender')}</Text>
        <View style={styles.row}>
          <Button title={t('common.female')} variant={gender === 'female' ? 'primary' : 'secondary'} onPress={() => setGender('female')} style={styles.half} />
          <Button title={t('common.male')} variant={gender === 'male' ? 'primary' : 'secondary'} onPress={() => setGender('male')} style={styles.half} />
        </View>

        <Text style={styles.label}>{t('chart.birthPlace')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('chart.birthPlacePh')}
          placeholderTextColor={colors.textSecondary}
          value={birthPlace}
          onChangeText={setBirthPlace}
        />

        {!isFirstTime ? (
          <>
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
          </>
        ) : (
          <Text style={styles.firstHint}>{t('chart.firstSetupHint')}</Text>
        )}

        <Button
          title={actionLabel}
          onPress={saveProfile}
          loading={loading}
          disabled={!loaded || loading}
          style={{ marginTop: 16 }}
        />
        {!isFirstTime ? <Text style={styles.disclaimer}>{t('chart.setupDisclaimer')}</Text> : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { ...typography.caption, marginBottom: spacing.md, lineHeight: 22 },
  sectionTitle: { ...typography.title, fontSize: 17, marginTop: spacing.md, marginBottom: 8 },
  hint: { ...typography.small, color: colors.textSecondary, marginBottom: 8 },
  firstHint: { ...typography.small, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 20 },
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
