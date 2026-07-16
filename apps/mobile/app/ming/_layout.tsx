import { Stack } from 'expo-router';

export default function MingLayout() {
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: '返回' }} />;
}
