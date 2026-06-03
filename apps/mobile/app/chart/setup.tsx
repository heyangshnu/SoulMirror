import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReportGeneratingOverlay } from '@/components/ui/ReportGeneratingOverlay';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export default function ChartSetupScreen() {
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : '请检查网络';
      Alert.alert('保存生辰失败', msg);
      return;
    }
    try {
      const report = await api.post<{ _id: string }>('/chart/reports/natal');
      router.replace(`/chart/result?natalId=${report._id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '请检查网络与后端';
      Alert.alert('生成报告失败', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '紫微斗数', headerTintColor: colors.primary }} />
      <ReportGeneratingOverlay visible={loading} />
      <Screen keyboardAvoid>
        <Text style={styles.desc}>三合派排盘 · 真太阳时校正 · 结合你的近况个性化解读</Text>

        <Text style={styles.sectionTitle}>生辰信息</Text>

        <Text style={styles.label}>历法</Text>
        <View style={styles.row}>
          <Button title="阳历" variant={calendar === 'solar' ? 'primary' : 'secondary'} onPress={() => setCalendar('solar')} style={styles.half} />
          <Button title="农历" variant={calendar === 'lunar' ? 'primary' : 'secondary'} onPress={() => setCalendar('lunar')} style={styles.half} />
        </View>

        <Text style={styles.label}>出生日期 (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} />

        <View style={styles.switchRow}>
          <Text style={styles.label}>时辰不详（默认午时）</Text>
          <Switch value={timeUnknown} onValueChange={setTimeUnknown} />
        </View>
        {timeUnknown ? (
          <Text style={styles.warn}>⚠️ 时辰未知时结果可能不够准确，解读仅供参考</Text>
        ) : (
          <>
            <Text style={styles.label}>出生时间 (HH:mm)</Text>
            <TextInput style={styles.input} value={birthTime} onChangeText={setBirthTime} />
          </>
        )}

        <Text style={styles.label}>性别</Text>
        <View style={styles.row}>
          <Button title="女" variant={gender === 'female' ? 'primary' : 'secondary'} onPress={() => setGender('female')} style={styles.half} />
          <Button title="男" variant={gender === 'male' ? 'primary' : 'secondary'} onPress={() => setGender('male')} style={styles.half} />
        </View>

        <Text style={styles.label}>出生地（真太阳时）</Text>
        <TextInput style={styles.input} placeholder="如：北京、成都" value={birthPlace} onChangeText={setBirthPlace} />

        <Text style={styles.sectionTitle}>个性化背景</Text>
        <Text style={styles.hint}>以下内容会作为 AI 解读的背景，让报告更贴近你此刻的处境</Text>

        <Card style={styles.personalCard}>
          <Text style={styles.label}>你现在的状态</Text>
          <TextInput
            style={styles.area}
            multiline
            placeholder="例如：刚换工作，有点焦虑但也充满期待…"
            value={currentState}
            onChangeText={setCurrentState}
            blurOnSubmit={false}
          />
          <Text style={styles.label}>想测算的方向</Text>
          <TextInput
            style={styles.area}
            multiline
            placeholder="例如：事业转型、感情走向、如何缓解焦虑…"
            value={focusDirection}
            onChangeText={setFocusDirection}
            blurOnSubmit={false}
          />
        </Card>

        <Button title="生成紫微解读" onPress={saveAndReport} loading={loading} style={{ marginTop: 16 }} />
        <Text style={styles.disclaimer}>内测全免费 · 仅供自我觉察与娱乐参考</Text>
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
