import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function MingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: '返回',
        headerTintColor: colors.primary,
        title: '命理报告',
      }}
    />
  );
}
