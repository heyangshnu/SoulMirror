import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Redirect href="/(tabs)/today" />;
  return <Redirect href="/auth/login" />;
}
