import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export default function VoiceDiaryScreen() {
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
      Alert.alert('已保存', '日记已纳入命盘生活背景');
    } catch (e) {
      Alert.alert('保存失败', e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  };

  const saveFocus = async () => {
    if (!focus.trim()) return;
    await api.put('/chart/weekly-focus', { focus: focus.trim() });
    Alert.alert('已更新本周焦点');
  };

  const syncChat = async () => {
    setLoading(true);
    try {
      await api.post('/chart/chat-summary');
      Alert.alert('已同步', '近期聊天摘要已写入命盘背景');
    } catch (e) {
      Alert.alert('同步失败', e instanceof Error ? e.message : '请先与心镜聊聊');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '语音日记', headerTintColor: colors.primary }} />
      <Screen keyboardAvoid>
        <Text style={styles.desc}>
          内测支持文字输入（ASR：配置 OPENAI_API_KEY 后可传语音）。内容会进入命盘解读与心镜对话背景。
        </Text>

        <Card>
          <Text style={styles.label}>今日日记</Text>
          <TextInput
            style={styles.area}
            multiline
            placeholder="说说今天的心情与觉察…"
            value={text}
            onChangeText={setText}
          />
          <Button title="保存日记" onPress={saveDiary} loading={loading} />
        </Card>

        <Card>
          <Text style={styles.label}>本周焦点</Text>
          <TextInput style={styles.input} value={focus} onChangeText={setFocus} placeholder="如：稳定情绪、改善沟通" />
          <Button title="更新焦点" variant="secondary" onPress={saveFocus} />
        </Card>

        <Button title="同步聊天摘要到命盘" variant="secondary" onPress={syncChat} loading={loading} />

        {entries.length > 0 && (
          <Card>
            <Text style={styles.label}>最近日记</Text>
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
