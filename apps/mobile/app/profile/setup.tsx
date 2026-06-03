import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

const AGE_OPTIONS = ['18-24', '25-30', '31-40', '41+'];
const TONES = [
  { id: 'gentle', label: '温柔' },
  { id: 'rational', label: '理性' },
  { id: 'humorous', label: '幽默' },
];

export default function ProfileSetupScreen() {
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
      Alert.alert('保存失败', e instanceof Error ? e.message : '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '用户画像', headerTintColor: colors.primary }} />
      <Screen keyboardAvoid>
        <Text style={styles.desc}>帮助心镜更懂你，打造专属陪伴体验</Text>
        <Text style={styles.label}>年龄段</Text>
        <View style={styles.chips}>
          {AGE_OPTIONS.map((a) => (
            <Pressable key={a} style={[styles.chip, ageRange === a && styles.chipActive]} onPress={() => setAgeRange(a)}>
              <Text style={[styles.chipText, ageRange === a && styles.chipTextActive]}>{a}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>职业（可选）</Text>
        <TextInput style={styles.input} placeholder="如：设计师" value={occupation} onChangeText={setOccupation} />
        <Text style={styles.label}>当前困惑</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="最近在想什么？"
          value={concern}
          onChangeText={setConcern}
          multiline
        />
        <Text style={styles.label}>机器人语气</Text>
        <View style={styles.chips}>
          {TONES.map((t) => (
            <Pressable key={t.id} style={[styles.chip, botTone === t.id && styles.chipActive]} onPress={() => setBotTone(t.id)}>
              <Text style={[styles.chipText, botTone === t.id && styles.chipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="完成" onPress={save} loading={loading} style={{ marginTop: 24 }} />
        <Button title="稍后再说" variant="ghost" onPress={() => router.replace('/(tabs)/explore')} />
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
