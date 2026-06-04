import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { detectAccountType, normalizeAccount } from '@/lib/account';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme/tokens';

const TERMS_VERSION = '1.0';
type Mode = 'login' | 'register';

type AuthResponse = {
  accessToken: string;
  user: { id: string; phone?: string; email?: string; nickname?: string };
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<Mode>('login');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const finishAuth = (res: AuthResponse) => {
    setAuth(res.accessToken, res.user);
    router.replace('/onboarding');
  };

  const validateAccount = (): 'email' | 'phone' | null => {
    const kind = detectAccountType(account);
    if (!kind) {
      Alert.alert(t('common.ok'), t('auth.accountInvalid'));
      return null;
    }
    return kind;
  };

  const login = async () => {
    const kind = validateAccount();
    if (!kind) return;
    setLoading(true);
    try {
      const normalized = normalizeAccount(account, kind);
      const path = kind === 'email' ? '/auth/login' : '/auth/phone/login';
      const body =
        kind === 'email' ? { email: normalized, password } : { phone: normalized, password };
      const res = await api.post<AuthResponse>(path, body, false);
      finishAuth(res);
    } catch (e) {
      Alert.alert(t('auth.loginFail'), e instanceof Error ? e.message : t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    const kind = validateAccount();
    if (!kind) return;
    if (password.length < 6) {
      Alert.alert(t('common.ok'), t('auth.passwordShort'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.ok'), t('auth.passwordMismatch'));
      return;
    }
    if (!termsAccepted) {
      Alert.alert(t('common.ok'), t('auth.termsRequired'));
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizeAccount(account, kind);
      const terms = { terms_accepted: termsAccepted, terms_version: TERMS_VERSION };
      const path = kind === 'email' ? '/auth/register' : '/auth/phone/register';
      const body =
        kind === 'email'
          ? { email: normalized, password, ...terms }
          : { phone: normalized, password, ...terms };
      const res = await api.post<AuthResponse>(path, body, false);
      finishAuth(res);
    } catch (e) {
      Alert.alert(t('auth.registerFail'), e instanceof Error ? e.message : t('common.retryLater'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboardAvoid>
      <View style={styles.header}>
        <Text style={styles.logo}>{t('auth.logo')}</Text>
        <Text style={styles.tagline}>{t('auth.tagline')}</Text>
      </View>

      <View style={styles.tabs}>
        {(['login', 'register'] as Mode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.tab, mode === m && styles.tabActive]}>
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'login' ? t('auth.login') : t('auth.register')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('auth.account')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('auth.accountPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={account}
        onChangeText={setAccount}
      />

      <Text style={styles.label}>{t('auth.password')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {mode === 'register' && (
        <>
          <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.confirmPlaceholder')}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Pressable onPress={() => setTermsAccepted(!termsAccepted)} style={styles.termsRow}>
            <Text style={styles.termsCheck}>{termsAccepted ? '☑' : '☐'}</Text>
            <Text style={styles.termsText}>{t('auth.terms')}</Text>
          </Pressable>
        </>
      )}

      <Button
        title={mode === 'login' ? t('auth.enter') : t('auth.registerEnter')}
        onPress={mode === 'login' ? login : register}
        loading={loading}
        style={styles.submit}
      />

      <Text style={styles.hint}>{t('auth.hint')}</Text>
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
