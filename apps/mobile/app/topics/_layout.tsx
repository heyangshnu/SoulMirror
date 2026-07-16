import { Stack } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/theme/tokens';

export default function TopicsLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: '返回',
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('topics.title') }} />
    </Stack>
  );
}
