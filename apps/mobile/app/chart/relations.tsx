import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReportGeneratingOverlay } from '@/components/ui/ReportGeneratingOverlay';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type Relation = {
  _id: string;
  name: string;
  relationType: string;
  birthDate: string;
};

const RELATION_TYPES = ['spouse', 'child', 'parent', 'sibling'] as const;

function relationTypeLabel(t: (key: string) => string, type: string) {
  const key = `chart.relationTypes.${type}`;
  const label = t(key);
  return label === key ? type : label;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function ChartRelationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [relationType, setRelationType] = useState<(typeof RELATION_TYPES)[number]>('spouse');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [birthTime, setBirthTime] = useState('12:00');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<Relation[]>('/chart/relations')
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async () => {
    if (!name.trim()) return Alert.alert(t('chart.nameRequired'));
    setSaving(true);
    try {
      await api.post('/chart/relations', {
        name: name.trim(),
        relationType,
        birthDate,
        birthTime: timeUnknown ? '12:00' : birthTime,
        gender,
        timeUnknown,
      });
      setShowForm(false);
      setName('');
      load();
    } catch (e) {
      Alert.alert(t('chart.addFail'), e instanceof Error ? e.message : t('chart.maxRelations'));
    } finally {
      setSaving(false);
    }
  };

  const genReport = async (id: string) => {
    if (generatingId) return;
    setGeneratingId(id);
    try {
      const report = await api.post<{ _id: string }>(`/chart/relations/${id}/report`);
      router.push(`/report/${report._id}`);
    } catch (e) {
      Alert.alert(t('chart.genFail'), e instanceof Error ? e.message : '');
    } finally {
      setGeneratingId(null);
    }
  };

  const remove = (id: string, relationName: string) => {
    Alert.alert(t('chart.deleteRelationTitle'), t('chart.deleteRelationMsg', { name: relationName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await api.delete(`/chart/relations/${id}`);
            load();
          } catch (e) {
            Alert.alert(t('chart.deleteFail'), e instanceof Error ? e.message : '');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('chart.relationsNav'), headerTintColor: colors.primary }} />
      <ReportGeneratingOverlay visible={!!generatingId} />
      <Screen keyboardAvoid>
        <Text style={styles.desc}>{t('chart.relationsDesc')}</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : items.length === 0 ? (
          <Card>
            <Text style={styles.empty}>{t('chart.relationsEmpty')}</Text>
          </Card>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t('chart.addedCount', { n: items.length })}</Text>
            {items.map((r) => {
              const isGenerating = generatingId === r._id;
              const isDeleting = deletingId === r._id;
              const busy = !!generatingId || isDeleting;
              return (
                <Card key={r._id} style={styles.personCard}>
                  <Text style={styles.name}>{r.name}</Text>
                  <Text style={styles.meta}>
                    {relationTypeLabel(t, r.relationType)} · {r.birthDate}
                  </Text>
                  <View style={styles.row}>
                    <Button
                      title={isGenerating ? t('common.generating') : t('chart.relationReport')}
                      onPress={() => genReport(r._id)}
                      loading={isGenerating}
                      disabled={busy && !isGenerating}
                      style={styles.flex}
                    />
                    <Button
                      title={t('common.delete')}
                      variant="secondary"
                      onPress={() => remove(r._id, r.name)}
                      loading={isDeleting}
                      disabled={busy && !isDeleting}
                      style={styles.flex}
                    />
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {showForm ? (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>{t('chart.addRelation')}</Text>

            <Text style={styles.label}>{t('chart.name')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('chart.namePh')}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>{t('chart.relationType')}</Text>
            <View style={styles.chips}>
              {RELATION_TYPES.map((rt) => (
                <Chip
                  key={rt}
                  label={t(`chart.relationTypes.${rt}`)}
                  selected={relationType === rt}
                  onPress={() => setRelationType(rt)}
                />
              ))}
            </View>

            <Text style={styles.label}>{t('chart.birthDate')}</Text>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder={t('tests.datePlaceholder')}
            />

            <Text style={styles.label}>{t('chart.birthTime')}</Text>
            {timeUnknown ? (
              <Pressable style={styles.timeUnknownRow} onPress={() => setTimeUnknown(false)}>
                <Text style={styles.timeUnknownText}>{t('chart.timeUnknownRelation')}</Text>
                <Text style={styles.timeUnknownAction}>{t('chart.knownTime')}</Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={birthTime}
                  onChangeText={setBirthTime}
                  placeholder={t('tests.timePlaceholder')}
                />
                <Pressable onPress={() => setTimeUnknown(true)}>
                  <Text style={styles.link}>{t('chart.unknownTimeHint')}</Text>
                </Pressable>
              </>
            )}

            <Text style={styles.label}>{t('chart.gender')}</Text>
            <View style={styles.chips}>
              <Chip label={t('common.female')} selected={gender === 'female'} onPress={() => setGender('female')} />
              <Chip label={t('common.male')} selected={gender === 'male'} onPress={() => setGender('male')} />
            </View>

            <View style={styles.formActions}>
              <Button title={t('common.save')} onPress={add} loading={saving} />
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={() => setShowForm(false)}
                disabled={saving}
              />
            </View>
          </Card>
        ) : (
          items.length < 6 && (
            <Button
              title={t('chart.addRelation')}
              onPress={() => setShowForm(true)}
              style={styles.addBtn}
              disabled={!!generatingId}
            />
          )
        )}

        <Text style={styles.footerHint}>{t('chart.relationWait')}</Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { ...typography.caption, marginBottom: spacing.lg, lineHeight: 22 },
  sectionTitle: { ...typography.caption, fontWeight: '600', marginBottom: spacing.sm, color: colors.textSecondary },
  loader: { marginTop: spacing.xl },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  personCard: { marginBottom: spacing.sm },
  name: { ...typography.title, fontSize: 17, marginBottom: 4 },
  meta: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: 12, marginTop: 4 },
  flex: { flex: 1 },
  formCard: { marginTop: spacing.md },
  formTitle: { ...typography.title, fontSize: 18, marginBottom: spacing.md },
  label: { ...typography.caption, fontWeight: '600', marginBottom: 8, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    fontSize: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, fontWeight: '600', color: colors.primary },
  chipTextSelected: { color: '#fff' },
  timeUnknownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    backgroundColor: colors.primaryMuted,
  },
  timeUnknownText: { ...typography.body, fontSize: 15, color: colors.text, flex: 1 },
  timeUnknownAction: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  link: { ...typography.caption, color: colors.primary, fontWeight: '600', marginTop: 8 },
  formActions: { gap: 10, marginTop: spacing.lg },
  addBtn: { marginTop: spacing.lg },
  footerHint: {
    ...typography.small,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
});
