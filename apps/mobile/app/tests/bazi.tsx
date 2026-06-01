import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export default function BaziTestScreen() {
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
      Alert.alert('生成失败', e instanceof Error ? e.message : '请检查网络与后端服务');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '八字命盘', headerTintColor: colors.primary }} />
      <Screen>
        <Text style={styles.desc}>输入出生信息，获取四柱与性格、事业、感情解读</Text>
        <Text style={styles.label}>出生日期 (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} />
        <Text style={styles.label}>出生时间 (HH:mm)</Text>
        <TextInput style={styles.input} value={birthTime} onChangeText={setBirthTime} />
        <Text style={styles.label}>性别</Text>
        <View style={styles.row}>
          <Button title="女" variant={gender === 'female' ? 'primary' : 'secondary'} onPress={() => setGender('female')} style={styles.half} />
          <Button title="男" variant={gender === 'male' ? 'primary' : 'secondary'} onPress={() => setGender('male')} style={styles.half} />
        </View>
        <Text style={styles.label}>出生地（可选）</Text>
        <TextInput style={styles.input} placeholder="如：上海" value={birthPlace} onChangeText={setBirthPlace} />
        <Button title="生成命盘报告" onPress={submit} loading={loading} style={{ marginTop: 24 }} />
        <Text style={styles.disclaimer}>仅供自我探索与娱乐参考，不构成命理或医疗建议。</Text>
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
