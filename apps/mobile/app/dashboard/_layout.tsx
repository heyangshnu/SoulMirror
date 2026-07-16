import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return <Stack screenOptions={{ headerShown: true, headerBackTitle: '返回' }} />;
}
