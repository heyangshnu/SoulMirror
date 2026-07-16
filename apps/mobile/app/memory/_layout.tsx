import { Stack } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/theme/tokens';

export default function MemoryLayout() {
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
      <Stack.Screen name="index" options={{ title: t('memory.title') }} />
      <Stack.Screen name="item/[id]" options={{ title: t('memory.title') }} />
      <Stack.Screen name="event/[id]" options={{ title: t('memory.eventTitle') }} />
    </Stack>
  );
}
