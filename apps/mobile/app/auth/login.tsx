import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (phone.length < 11) {
      Alert.alert('提示', '请输入有效手机号');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/auth/sms/send', { phone }, false);
      setSent(true);
      Alert.alert('验证码', res.message || '已发送');
    } catch (e) {
      Alert.alert('错误', e instanceof Error ? e.message : '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ accessToken: string; user: { id: string; phone?: string; nickname?: string } }>(
        '/auth/sms/login',
        { phone, code },
        false,
      );
      setAuth(res.accessToken, res.user);
      router.replace('/onboarding');
    } catch (e) {
      Alert.alert('登录失败', e instanceof Error ? e.message : '请检查验证码');
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

      <Text style={styles.label}>手机号</Text>
      <TextInput
        style={styles.input}
        placeholder="请输入手机号"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        maxLength={11}
      />

      <Text style={styles.label}>验证码</Text>
      <View style={styles.codeRow}>
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="开发环境默认 123456"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          maxLength={6}
        />
        <Button title="获取" onPress={sendCode} variant="secondary" loading={loading && !sent} style={styles.codeBtn} />
      </View>

      <Button title="进入心镜" onPress={login} loading={loading} style={styles.submit} />

      <Text style={styles.hint}>登录即表示同意《用户协议》与《隐私政策》</Text>
      <Text style={styles.devHint}>开发模式：验证码固定为 123456</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 48, marginBottom: 40 },
  logo: { fontSize: 40, fontWeight: '700', color: colors.primary },
  tagline: { ...typography.caption, marginTop: 8 },
  label: { ...typography.caption, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeInput: { flex: 1, marginBottom: 0 },
  codeBtn: { height: 52, minWidth: 88 },
  submit: { marginTop: 32 },
  hint: { ...typography.small, textAlign: 'center', marginTop: 24 },
  devHint: { ...typography.small, textAlign: 'center', marginTop: 8, color: colors.primary },
});
