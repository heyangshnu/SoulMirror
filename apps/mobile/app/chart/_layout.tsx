import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function ChartLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
