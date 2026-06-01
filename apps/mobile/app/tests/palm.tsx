import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export default function PalmTestScreen() {
  const router = useRouter();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('需要相机权限', '请在设置中允许访问相机');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setUri(result.assets[0].uri);
  };

  const analyze = async () => {
    setLoading(true);
    try {
      const report = await api.post<{ _id: string }>('/tests/palm/upload', {
        note: uri ? '已上传手掌照片' : undefined,
      });
      router.replace(`/report/${report._id}`);
    } catch (e) {
      Alert.alert('分析失败', e instanceof Error ? e.message : '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: '手相分析', headerTintColor: colors.primary }} />
      <Screen>
        <Text style={styles.desc}>在光线充足处拍摄手掌，保持掌心平整。原图将在 7 天后自动删除。</Text>
        <View style={styles.frame}>
          {uri ? (
            <Image source={{ uri }} style={styles.preview} />
          ) : (
            <Text style={styles.placeholder}>将手掌置于框内</Text>
          )}
        </View>
        <Button title="拍摄手掌" variant="secondary" onPress={pick} />
        <Button title="生成掌纹报告" onPress={analyze} loading={loading} style={{ marginTop: 16 }} />
        {!uri && (
          <Button title="跳过拍照，使用模板解读" variant="ghost" onPress={analyze} style={{ marginTop: 8 }} />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  desc: { ...typography.caption, marginBottom: spacing.lg },
  frame: {
    height: 280,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  placeholder: { ...typography.caption, color: colors.primary },
});
