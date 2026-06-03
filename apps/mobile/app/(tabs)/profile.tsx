import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { API_BASE, api } from './api';
import { runNetworkCheck } from '@/lib/network-check';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme/tokens';

type UserMe = {
  nickname?: string;
  phone?: string;
  botTone?: string;
  anonymousMode?: boolean;
};

const TONE_LABELS: Record<string, string> = {
  gentle: '温柔',
  rational: '理性',
  humorous: '幽默',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [me, setMe] = useState<UserMe>({});

  useFocusEffect(
    useCallback(() => {
      api.get<UserMe>('/user/me').then(setMe).catch(() => {});
    }, []),
  );

  const runDiag = async () => {
    try {
      const items = await runNetworkCheck();
      const lines = items.map((i) => `${i.ok ? '✅' : '❌'} ${i.name}\n${i.detail}`).join('\n\n');
      Alert.alert('网络诊断', `${lines}\n\n当前 API：${API_BASE}`);
    } catch (e) {
      Alert.alert('诊断失败', e instanceof Error ? e.message : '未知错误');
    }
  };

  const deleteAccount = () => {
    Alert.alert('删除账号', '将永久删除所有数据，确定继续？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/user');
            logout();
            router.replace('/auth/login');
          } catch (e) {
            Alert.alert('失败', e instanceof Error ? e.message : '请稍后重试');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Text style={styles.title}>我的</Text>

      <Card>
        <Text style={styles.name}>{me.nickname || user?.nickname || '心镜用户'}</Text>
        <Text style={styles.phone}>{me.phone || user?.phone || ''}</Text>
        <Text style={styles.meta}>机器人语气：{TONE_LABELS[me.botTone || 'gentle']}</Text>
      </Card>

      <Pressable onPress={() => router.push('/profile/setup')}>
        <Card>
          <Text style={styles.link}>编辑用户画像</Text>
        </Card>
      </Pressable>

      <Card>
        <View style={styles.row}>
          <Text style={styles.link}>匿名模式</Text>
          <Switch value={me.anonymousMode} disabled trackColor={{ true: colors.primary }} />
        </View>
        <Text style={styles.hint}>开启后减少可选信息采集</Text>
      </Card>

      <Card>
        <Text style={styles.link}>隐私政策</Text>
        <Text style={[styles.link, { marginTop: 12 }]}>用户协议</Text>
      </Card>

      <Button title="网络诊断" variant="secondary" onPress={runDiag} />
      <Button title="退出登录" variant="secondary" onPress={() => { logout(); router.replace('/auth/login'); }} style={{ marginTop: 12 }} />
      <Button title="一键删除账号" variant="ghost" onPress={deleteAccount} style={{ marginTop: 8 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md, marginBottom: spacing.lg },
  name: { ...typography.title },
  phone: { ...typography.caption, marginTop: 4 },
  meta: { ...typography.small, marginTop: 8 },
  link: { ...typography.body, fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { ...typography.small, marginTop: 8 },
});
