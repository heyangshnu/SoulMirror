import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { colors } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthGate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tests/bazi" />
        <Stack.Screen name="tests/mbti" />
        <Stack.Screen name="tests/tarot" />
        <Stack.Screen name="tests/palm" />
        <Stack.Screen name="chart" options={{ headerShown: false }} />
        <Stack.Screen name="profile/setup" />
        <Stack.Screen name="report/[id]" options={{ headerShown: true, title: '测试报告', headerTintColor: colors.primary }} />
        <Stack.Screen name="social/chat/[friendId]" options={{ headerShown: true }} />
      </Stack>
    </SafeAreaProvider>
  );
}

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { token, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!token && !inAuth) {
      router.replace('/auth/login');
    } else if (token && inAuth) {
      router.replace('/(tabs)/explore');
    } else if (token && segments[0] === 'index') {
      router.replace('/(tabs)/explore');
    } else if (!token && inOnboarding) {
      router.replace('/auth/login');
    }
  }, [token, hydrated, segments, router]);

  return null;
}
