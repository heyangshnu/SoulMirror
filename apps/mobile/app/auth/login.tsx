import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme/tokens';

const TERMS_VERSION = '1.0';
type Mode = 'login' | 'register';

type AuthResponse = {
  accessToken: string;
  user: { id: string; phone?: string; nickname?: string };
};

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 11);

  const finishAuth = (res: AuthResponse) => {
    setAuth(res.accessToken, res.user);
    router.replace('/onboarding');
  };

  const login = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      Alert.alert('提示', '请输入 11 位手机号');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>(
        '/auth/phone/login',
        { phone, password },
        false,
      );
      finishAuth(res);
    } catch (e) {
      Alert.alert('登录失败', e instanceof Error ? e.message : '手机号或密码错误');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (!/^1\d{10}$/.test(phone)) {
      Alert.alert('提示', '请输入 11 位手机号');
      return;
    }
    if (password.length < 6) {
      Alert.alert('提示', '密码至少 6 位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '两次密码不一致');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('提示', '请先同意用户协议');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<AuthResponse>(
        '/auth/phone/register',
        {
          phone,
          password,
          terms_accepted: termsAccepted,
          terms_version: TERMS_VERSION,
        },
        false,
      );
      finishAuth(res);
    } catch (e) {
      Alert.alert('注册失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAvoid>
      <View style={styles.header}>
        <Text style={styles.logo}>心镜</Text>
        <Text style={styles.tagline}>看见自己，温柔陪伴</Text>
      </View>

      <View style={styles.tabs}>
        {(['login', 'register'] as Mode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && styles.tabActive]}>
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'login' ? '登录' : '注册'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>手机号</Text>
      <TextInput
        style={styles.input}
        placeholder="11 位手机号"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={(v) => setPhone(normalizePhone(v))}
        maxLength={11}
      />

      <Text style={styles.label}>密码</Text>
      <TextInput
        style={styles.input}
        placeholder="至少 6 位"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {mode === 'register' && (
        <>
          <Text style={styles.label}>确认密码</Text>
          <TextInput
            style={styles.input}
            placeholder="再次输入密码"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Pressable onPress={() => setTermsAccepted(!termsAccepted)} style={styles.termsRow}>
            <Text style={styles.termsCheck}>{termsAccepted ? '☑' : '☐'}</Text>
            <Text style={styles.termsText}>我已阅读并同意《用户协议》与《隐私政策》</Text>
          </Pressable>
        </>
      )}

      <Button
        title={mode === 'login' ? '进入心镜' : '注册并进入'}
        onPress={mode === 'login' ? login : register}
        loading={loading}
        style={styles.submit}
      />

      <Text style={styles.hint}>手机号 + 密码注册，无需短信验证码</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 48, marginBottom: 24 },
  logo: { fontSize: 40, fontWeight: '700', color: colors.primary },
  tagline: { ...typography.caption, marginTop: 8, color: colors.textSecondary },
  tabs: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  label: { ...typography.caption, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  submit: { marginTop: 8 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  termsCheck: { fontSize: 18, color: colors.primary },
  termsText: { ...typography.small, flex: 1, color: colors.textSecondary },
  hint: { ...typography.small, textAlign: 'center', marginTop: 24, color: colors.textSecondary },
});
