import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { API_BASE, api } from '@/lib/api';
import { runNetworkCheck } from '@/lib/network-check';
import { useAuthStore } from '@/store/auth';
import { useTranslation, toneLabel } from '@/hooks/useTranslation';
import { colors, spacing, typography } from '@/theme/tokens';

type UserMe = {
  nickname?: string;
  phone?: string;
  email?: string;
  botTone?: string;
  anonymousMode?: boolean;
};

export default function ProfileScreen() {
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [me, setMe] = useState<UserMe>({});

  useFocusEffect(
    useCallback(() => {
      api.get<UserMe>('/user/me').then(setMe).catch(() => {});
    }, []),
  );

  const runDiag = async () => {
    try {
      const items = await runNetworkCheck(locale);
      const lines = items.map((i) => `${i.ok ? '✅' : '❌'} ${i.name}\n${i.detail}`).join('\n\n');
      Alert.alert(t('profile.diagTitle'), `${lines}\n\n${t('profile.currentApi')}${API_BASE}`);
    } catch (e) {
      Alert.alert(t('profile.diagFail'), e instanceof Error ? e.message : t('profile.unknownError'));
    }
  };

  const deleteAccount = () => {
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/user');
            logout();
            router.replace('/auth/login');
          } catch (e) {
            Alert.alert(t('common.fail'), e instanceof Error ? e.message : t('common.retryLater'));
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <Card>
        <Text style={styles.name}>{me.nickname || user?.nickname || t('profile.defaultName')}</Text>
        <Text style={styles.phone}>
          {me.phone || user?.phone || me.email || user?.email || t('profile.noPhone')}
        </Text>
        <Text style={styles.meta}>
          {t('profile.botTone')}
          {toneLabel(t, me.botTone)}
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>{t('profile.language')}</Text>
        <View style={styles.langRow}>
          <Pressable
            onPress={() => setLocale('zh')}
            style={[styles.langBtn, locale === 'zh' && styles.langBtnActive]}
          >
            <Text style={[styles.langText, locale === 'zh' && styles.langTextActive]}>
              {t('profile.languageZh')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLocale('en')}
            style={[styles.langBtn, locale === 'en' && styles.langBtnActive]}
          >
            <Text style={[styles.langText, locale === 'en' && styles.langTextActive]}>
              {t('profile.languageEn')}
            </Text>
          </Pressable>
        </View>
      </Card>

      <Pressable onPress={() => router.push('/profile/setup')}>
        <Card>
          <Text style={styles.link}>{t('profile.editPersona')}</Text>
        </Card>
      </Pressable>

      <Card>
        <View style={styles.row}>
          <Text style={styles.link}>{t('profile.anonymous')}</Text>
          <Switch value={me.anonymousMode} disabled trackColor={{ true: colors.primary }} />
        </View>
        <Text style={styles.hint}>{t('profile.anonymousHint')}</Text>
      </Card>

      <Card>
        <Text style={styles.link}>{t('profile.privacy')}</Text>
        <Text style={[styles.link, { marginTop: 12 }]}>{t('profile.terms')}</Text>
      </Card>

      <Button title={t('profile.networkDiag')} variant="secondary" onPress={runDiag} />
      <Button
        title={t('profile.logout')}
        variant="secondary"
        onPress={() => {
          logout();
          router.replace('/auth/login');
        }}
        style={{ marginTop: 12 }}
      />
      <Button
        title={t('profile.deleteAccount')}
        variant="ghost"
        onPress={deleteAccount}
        style={{ marginTop: 8 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md, marginBottom: spacing.lg },
  name: { ...typography.title },
  phone: { ...typography.caption, marginTop: 4 },
  meta: { ...typography.small, marginTop: 8 },
  link: { ...typography.body, fontWeight: '500' },
  sectionLabel: { ...typography.body, fontWeight: '600', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hint: { ...typography.small, marginTop: 8 },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  langBtnActive: { backgroundColor: colors.primaryMuted },
  langText: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
  langTextActive: { color: colors.primary },
});
