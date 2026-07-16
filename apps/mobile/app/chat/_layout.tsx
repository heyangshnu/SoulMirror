import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: '返回',
      }}
    >
      <Stack.Screen name="index" options={{ title: '对话' }} />
    </Stack>
  );
}
