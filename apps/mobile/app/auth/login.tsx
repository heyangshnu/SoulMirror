import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme/tokens';

const TERMS_VERSION = '1.0';
type Mode = 'login' | 'register' | 'forgot';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>('login');
  const [emailVerifyEnabled, setEmailVerifyEnabled] = useState(true);
  const [emailDevMode, setEmailDevMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get<{ email_verify_enabled: boolean; email_dev_mode?: boolean }>('/auth/config', false)
      .then((cfg) => {
        setEmailVerifyEnabled(!!cfg.email_verify_enabled);
        setEmailDevMode(!!cfg.email_dev_mode);
      })
      .catch(() => setEmailVerifyEnabled(true));
  }, []);

  useEffect(() => {
    if (sendCooldown <= 0) return;
    const t = setInterval(() => setSendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [sendCooldown]);

  const sendRegisterCode = async () => {
    if (!email.includes('@')) {
      Alert.alert('提示', '请输入有效邮箱');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('提示', '请先同意用户协议');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ message?: string; dev_code?: string }>(
        '/auth/send-register-code',
        { email },
        false,
      );
      setSendCooldown(60);
      if (res.dev_code) {
        Alert.alert('开发模式验证码', `本地未发真实邮件，验证码：${res.dev_code}`);
      } else {
        Alert.alert('验证码', res.message || '已发送到您的邮箱');
      }
    } catch (e) {
      Alert.alert('错误', e instanceof Error ? e.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const sendResetCode = async () => {
    if (!email.includes('@')) {
      Alert.alert('提示', '请输入有效邮箱');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ message?: string; dev_code?: string }>(
        '/auth/send-reset-password-code',
        { email },
        false,
      );
      setSendCooldown(60);
      if (res.dev_code) {
        Alert.alert('开发模式验证码', `本地未发真实邮件，验证码：${res.dev_code}`);
      } else {
        Alert.alert('提示', res.message || '若邮箱已注册，验证码将发送到您的邮箱');
      }
    } catch (e) {
      Alert.alert('错误', e instanceof Error ? e.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    if (password.length < 6) {
      Alert.alert('提示', '密码至少 6 位');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('提示', '两次密码不一致');
      return;
    }
    setLoading(true);
    try {
      await api.post(
        '/auth/register',
        {
          email,
          password,
          verification_code: emailVerifyEnabled ? verificationCode : undefined,
          terms_accepted: termsAccepted,
          terms_version: TERMS_VERSION,
        },
        false,
      );
      Alert.alert('注册成功', '请登录');
      setMode('login');
    } catch (e) {
      Alert.alert('注册失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    setLoading(true);
    try {
      const res = await api.post<{
        accessToken: string;
        user: { id: string; email?: string; nickname?: string };
      }>('/auth/login', { email, password }, false);
      setAuth(res.accessToken, res.user);
      router.replace('/onboarding');
    } catch (e) {
      Alert.alert('登录失败', e instanceof Error ? e.message : '邮箱或密码错误');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('提示', '新密码至少 6 位');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        verification_code: resetCode,
        new_password: newPassword,
      }, false);
      Alert.alert('成功', '密码已重置，请登录');
      setMode('login');
    } catch (e) {
      Alert.alert('失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
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

      <Text style={styles.label}>邮箱</Text>
      <TextInput
        style={styles.input}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      {mode === 'login' && (
        <>
          <Text style={styles.label}>密码</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入密码"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="进入心镜" onPress={login} loading={loading} style={styles.submit} />
          <Pressable onPress={() => setMode('forgot')}>
            <Text style={styles.link}>忘记密码？</Text>
          </Pressable>
        </>
      )}

      {mode === 'register' && (
        <>
          <Text style={styles.label}>密码</Text>
          <TextInput
            style={styles.input}
            placeholder="至少 6 位"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Text style={styles.label}>确认密码</Text>
          <TextInput
            style={styles.input}
            placeholder="再次输入密码"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          {emailVerifyEnabled && (
            <>
              <Text style={styles.label}>邮箱验证码</Text>
              <View style={styles.codeRow}>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="6 位验证码"
                  keyboardType="number-pad"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  maxLength={6}
                />
                <Button
                  title={sendCooldown > 0 ? `${sendCooldown}s` : '获取'}
                  onPress={sendRegisterCode}
                  variant="secondary"
                  disabled={sendCooldown > 0}
                  loading={loading}
                  style={styles.codeBtn}
                />
              </View>
            </>
          )}
          <Pressable onPress={() => setTermsAccepted(!termsAccepted)} style={styles.termsRow}>
            <Text style={styles.termsCheck}>{termsAccepted ? '☑' : '☐'}</Text>
            <Text style={styles.termsText}>我已阅读并同意《用户协议》与《隐私政策》</Text>
          </Pressable>
          <Button title="注册" onPress={register} loading={loading} style={styles.submit} />
        </>
      )}

      {mode === 'forgot' && (
        <>
          <Text style={styles.label}>验证码</Text>
          <View style={styles.codeRow}>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="6 位验证码"
              keyboardType="number-pad"
              value={resetCode}
              onChangeText={setResetCode}
              maxLength={6}
            />
            <Button
              title={sendCooldown > 0 ? `${sendCooldown}s` : '获取'}
              onPress={sendResetCode}
              variant="secondary"
              disabled={sendCooldown > 0}
              style={styles.codeBtn}
            />
          </View>
          <Text style={styles.label}>新密码</Text>
          <TextInput
            style={styles.input}
            placeholder="至少 6 位"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Button title="重置密码" onPress={resetPassword} loading={loading} style={styles.submit} />
          <Pressable onPress={() => setMode('login')}>
            <Text style={styles.link}>返回登录</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.hint}>登录即表示同意《用户协议》与《隐私政策》</Text>
      {emailDevMode && (
        <Text style={styles.devHint}>
          本地开发模式：验证码不会发邮件，点「获取」后弹窗会显示 6 位数字
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 48, marginBottom: 24 },
  logo: { fontSize: 40, fontWeight: '700', color: colors.primary },
  tagline: { ...typography.caption, marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.backgroundSecondary, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.caption, fontWeight: '600' },
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
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  codeInput: { flex: 1, marginBottom: 0 },
  codeBtn: { height: 52, minWidth: 88 },
  submit: { marginTop: 8 },
  link: { ...typography.caption, color: colors.primary, textAlign: 'center', marginTop: 16 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  termsCheck: { fontSize: 18, color: colors.primary },
  termsText: { ...typography.small, flex: 1 },
  hint: { ...typography.small, textAlign: 'center', marginTop: 24 },
  devHint: { ...typography.small, textAlign: 'center', marginTop: 8, color: colors.primary },
});
