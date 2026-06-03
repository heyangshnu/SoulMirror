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
import { api } from '@/lib/api';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type Relation = {
  _id: string;
  name: string;
  relationType: string;
  birthDate: string;
};

const TYPE_LABEL: Record<string, string> = {
  spouse: '配偶',
  child: '子女',
  parent: '父母',
  sibling: '兄弟姐妹',
  other: '其他',
};

const RELATION_TYPES = ['spouse', 'child', 'parent', 'sibling'] as const;

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
    if (!name.trim()) return Alert.alert('请填写姓名');
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
      Alert.alert('添加失败', e instanceof Error ? e.message : '最多 6 人');
    } finally {
      setSaving(false);
    }
  };

  const genReport = async (id: string, relationName: string) => {
    if (generatingId) return;
    setGeneratingId(id);
    try {
      const report = await api.post<{ _id: string }>(`/chart/relations/${id}/report`);
      router.push(`/report/${report._id}`);
    } catch (e) {
      Alert.alert('生成失败', e instanceof Error ? e.message : '');
    } finally {
      setGeneratingId(null);
    }
  };

  const remove = (id: string, relationName: string) => {
    Alert.alert('删除关系人', `确定删除「${relationName}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await api.delete(`/chart/relations/${id}`);
            load();
          } catch (e) {
            Alert.alert('删除失败', e instanceof Error ? e.message : '');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '关系人', headerTintColor: colors.primary }} />
      <ReportGeneratingOverlay visible={!!generatingId} />
      <Screen keyboardAvoid>
        <Text style={styles.desc}>
          添加配偶、子女、父母或兄弟姐妹，生成专属关系解读。最多 6 人，含飞星四化附录。
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : items.length === 0 ? (
          <Card>
            <Text style={styles.empty}>还没有关系人，点击下方按钮添加第一位</Text>
          </Card>
        ) : (
          <>
            <Text style={styles.sectionTitle}>已添加 · {items.length}/6</Text>
            {items.map((r) => {
              const isGenerating = generatingId === r._id;
              const isDeleting = deletingId === r._id;
              const busy = !!generatingId || isDeleting;
              return (
                <Card key={r._id} style={styles.personCard}>
                  <Text style={styles.name}>{r.name}</Text>
                  <Text style={styles.meta}>
                    {TYPE_LABEL[r.relationType] ?? r.relationType} · {r.birthDate}
                  </Text>
                  <View style={styles.row}>
                    <Button
                      title={isGenerating ? '生成中…' : '关系报告'}
                      onPress={() => genReport(r._id, r.name)}
                      loading={isGenerating}
                      disabled={busy && !isGenerating}
                      style={styles.flex}
                    />
                    <Button
                      title="删除"
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
            <Text style={styles.formTitle}>添加关系人</Text>

            <Text style={styles.label}>姓名</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入姓名"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>关系</Text>
            <View style={styles.chips}>
              {RELATION_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={TYPE_LABEL[t]}
                  selected={relationType === t}
                  onPress={() => setRelationType(t)}
                />
              ))}
            </View>

            <Text style={styles.label}>出生日期</Text>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>出生时辰</Text>
            {timeUnknown ? (
              <Pressable style={styles.timeUnknownRow} onPress={() => setTimeUnknown(false)}>
                <Text style={styles.timeUnknownText}>时辰未知（按午时排盘）</Text>
                <Text style={styles.timeUnknownAction}>改为已知</Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={birthTime}
                  onChangeText={setBirthTime}
                  placeholder="HH:mm"
                />
                <Pressable onPress={() => setTimeUnknown(true)}>
                  <Text style={styles.link}>不知道出生时辰？</Text>
                </Pressable>
              </>
            )}

            <Text style={styles.label}>性别</Text>
            <View style={styles.chips}>
              <Chip label="女" selected={gender === 'female'} onPress={() => setGender('female')} />
              <Chip label="男" selected={gender === 'male'} onPress={() => setGender('male')} />
            </View>

            <View style={styles.formActions}>
              <Button title="保存" onPress={add} loading={saving} />
              <Button
                title="取消"
                variant="secondary"
                onPress={() => setShowForm(false)}
                disabled={saving}
              />
            </View>
          </Card>
        ) : (
          items.length < 6 && (
            <Button
              title="添加关系人"
              onPress={() => setShowForm(true)}
              style={styles.addBtn}
              disabled={!!generatingId}
            />
          )
        )}

        <Text style={styles.footerHint}>关系报告生成较慢，请耐心等待，无需重复点击。</Text>
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
