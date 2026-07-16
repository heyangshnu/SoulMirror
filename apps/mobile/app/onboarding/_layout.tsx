import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: '返回' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
