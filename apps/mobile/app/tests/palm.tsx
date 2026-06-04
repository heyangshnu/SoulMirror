import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export default function PalmTestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('tests.cameraPerm'), t('tests.cameraPermHint'));
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
      Alert.alert(t('tests.analyzeFail'), e instanceof Error ? e.message : t('common.retryLater'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('tests.palmNav'), headerTintColor: colors.primary }} />
      <Screen>
        <Text style={styles.desc}>{t('tests.palmDesc')}</Text>
        <View style={styles.frame}>
          {uri ? (
            <Image source={{ uri }} style={styles.preview} />
          ) : (
            <Text style={styles.placeholder}>{t('tests.palmFrame')}</Text>
          )}
        </View>
        <Button title={t('tests.takePhoto')} variant="secondary" onPress={pick} />
        <Button title={t('tests.genPalm')} onPress={analyze} loading={loading} style={{ marginTop: 16 }} />
        {!uri && (
          <Button title={t('tests.skipPhoto')} variant="ghost" onPress={analyze} style={{ marginTop: 8 }} />
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
