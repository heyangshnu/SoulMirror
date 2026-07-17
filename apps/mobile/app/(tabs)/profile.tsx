import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter, useFocusEffect, type Href } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProfileMenuDivider, ProfileMenuRow } from '@/components/ui/ProfileMenuRow';
import { API_BASE, api } from '@/lib/api';
import { runNetworkCheck } from '@/lib/network-check';
import { useAuthStore } from '@/store/auth';
import { useBodhisattvaChatStore } from '@/store/bodhisattva-chat';
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
  const clearChat = useBodhisattvaChatStore((s) => s.clearChat);
  const [me, setMe] = useState<UserMe>({});
  const [deleting, setDeleting] = useState(false);

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

  const goLogin = () => {
    clearChat();
    logout();
    router.replace('/auth/login' as Href);
  };

  const performDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await api.delete('/user');
      goLogin();
    } catch (e) {
      Alert.alert(
        t('common.fail'),
        e instanceof Error ? e.message : t('common.retryLater'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.logout'), onPress: goLogin },
        ],
      );
    } finally {
      setDeleting(false);
    }
  };

  const deleteAccount = () => {
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          // Avoid async onPress pitfalls on some Android Alert implementations.
          setTimeout(() => {
            void performDelete();
          }, 0);
        },
      },
    ]);
  };

  const displayName = me.nickname || user?.nickname || t('profile.defaultName');
  const displayContact = me.phone || user?.phone || me.email || user?.email || t('profile.noPhone');

  return (
    <Screen>
      <Text style={styles.pageTitle}>{t('profile.title')}</Text>

      <Card style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.slice(0, 1)}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.contact}>{displayContact}</Text>
          <Text style={styles.meta}>
            {t('profile.botTone')}
            {toneLabel(t, me.botTone)}
          </Text>
        </View>
      </Card>

      <Card style={styles.menuCard}>
        <ProfileMenuRow
          label={t('tabs.topics')}
          subtitle={t('topics.subtitle')}
          onPress={() => router.push('/topics' as Href)}
        />
        <ProfileMenuDivider />
        <ProfileMenuRow
          label={t('tabs.relations')}
          subtitle={t('relations.subtitle')}
          onPress={() => router.push('/relations' as Href)}
        />
        <ProfileMenuDivider />
        <ProfileMenuRow
          label={t('tabs.memory')}
          subtitle={t('memory.subtitle')}
          onPress={() => router.push('/memory' as Href)}
        />
        <ProfileMenuDivider />
        <ProfileMenuRow
          label={t('profile.birthProfile')}
          onPress={() => router.push('/chart/setup' as Href)}
        />
        <ProfileMenuDivider />
        <ProfileMenuRow
          label={t('profile.userPortrait')}
          onPress={() => router.push('/profile/setup' as Href)}
        />
      </Card>

      <Card style={styles.sectionCard}>
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

      <Card style={styles.sectionCard}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.rowLabel}>{t('profile.anonymous')}</Text>
            <Text style={styles.hint}>{t('profile.anonymousHint')}</Text>
          </View>
          <Switch value={me.anonymousMode} disabled trackColor={{ true: colors.primary }} />
        </View>
      </Card>

      <Card style={styles.menuCard}>
        <ProfileMenuRow label={t('profile.privacy')} onPress={() => {}} showChevron={false} />
        <ProfileMenuDivider />
        <ProfileMenuRow label={t('profile.terms')} onPress={() => {}} showChevron={false} />
      </Card>

      <View style={styles.footer}>
        {deleting ? (
          <View style={styles.deletingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.deletingText}>{t('profile.deleting')}</Text>
          </View>
        ) : null}
        <Button title={t('profile.networkDiag')} variant="secondary" onPress={runDiag} disabled={deleting} />
        <Button
          title={t('profile.logout')}
          variant="secondary"
          onPress={goLogin}
          disabled={deleting}
          style={{ marginTop: 12 }}
        />
        <Button
          title={t('profile.deleteAccount')}
          variant="ghost"
          onPress={deleteAccount}
          loading={deleting}
          disabled={deleting}
          style={{ marginTop: 8 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { ...typography.hero, marginTop: spacing.md, marginBottom: spacing.lg },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.title, color: colors.primary, fontSize: 22 },
  userInfo: { flex: 1 },
  name: { ...typography.title },
  contact: { ...typography.caption, marginTop: 4, color: colors.textSecondary },
  meta: { ...typography.small, marginTop: 8, color: colors.textSecondary },
  menuCard: { padding: 0, overflow: 'hidden', marginBottom: spacing.md },
  sectionCard: { marginBottom: spacing.md },
  sectionLabel: { ...typography.body, fontWeight: '600', marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  rowLabel: { ...typography.body, fontWeight: '500' },
  hint: { ...typography.small, marginTop: 6, lineHeight: 20, color: colors.textSecondary },
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
  footer: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  deletingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    justifyContent: 'center',
  },
  deletingText: { ...typography.caption, color: colors.textSecondary },
});
