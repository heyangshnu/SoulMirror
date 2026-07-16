import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useLegacyTabRedirect } from '@/hooks/useLegacyTabRedirect';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type DiscoverUser = {
  id: string;
  nickname: string;
  scores: Record<string, number>;
  mbti?: string;
  compatibility: number;
};

type Friend = {
  id: string;
  nickname: string;
  scores: Record<string, number>;
  mbti?: string;
};

type ChatRequest = {
  id: string;
  status: string;
  message?: string;
  user: { id: string; nickname: string; scores: Record<string, number>; mbti?: string };
};

export default function ConnectionsScreen() {
  useLegacyTabRedirect('/relations');
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<'discover' | 'friends' | 'requests'>('discover');
  const [discoverable, setDiscoverable] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [matches, setMatches] = useState<DiscoverUser[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.get<{ discoverable: boolean; hasMatchProfile: boolean }>(
        '/social/discover/status',
      );
      setDiscoverable(status.discoverable);
      setHasProfile(status.hasMatchProfile);

      const [discoverRes, friendsRes, reqRes] = await Promise.all([
        status.hasMatchProfile ? api.get<DiscoverUser[]>('/social/discover').catch(() => []) : Promise.resolve([]),
        api.get<Friend[]>('/social/friends').catch(() => []),
        api.get<{ incoming: ChatRequest[] }>('/social/chat-requests').catch(() => ({ incoming: [] })),
      ]);
      setMatches(discoverRes);
      setFriends(friendsRes);
      setIncoming(reqRes.incoming ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleDiscoverable = async (value: boolean) => {
    try {
      await api.post('/social/discover/enable', { discoverable: value });
      setDiscoverable(value);
      if (value) load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t('memorial.enableFail'));
    }
  };

  const requestChat = async (toUserId: string) => {
    try {
      await api.post('/social/chat-requests', { toUserId, message: t('memorial.requestMsg') });
      alert(t('memorial.requestSent'));
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t('memorial.requestFail'));
    }
  };

  const respond = async (id: string, accept: boolean) => {
    await api.patch(`/social/chat-requests/${id}`, { accept });
    load();
  };

  const scoreSummary = (scores: Record<string, number>) =>
    Object.entries(scores)
      .map(([k, v]) => `${k.toUpperCase()} ${v}`)
      .join(' · ');

  const tabRequests =
    incoming.length > 0 ? `${t('memorial.tabRequests')}(${incoming.length})` : t('memorial.tabRequests');

  return (
    <Screen>
      <Text style={styles.title}>{t('memorial.title')}</Text>
      <Text style={styles.subtitle}>{t('memorial.subtitle')}</Text>

      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>{t('memorial.matchToggle')}</Text>
            <Text style={styles.switchHint}>{hasProfile ? t('memorial.matchOn') : t('memorial.matchOff')}</Text>
          </View>
          <Switch
            value={discoverable}
            onValueChange={toggleDiscoverable}
            trackColor={{ true: colors.primaryMuted }}
            thumbColor={discoverable ? colors.primary : undefined}
            disabled={!hasProfile}
          />
        </View>
      </Card>

      <View style={styles.tabs}>
        {(['discover', 'friends', 'requests'] as const).map((tabKey) => (
          <Pressable
            key={tabKey}
            onPress={() => setTab(tabKey)}
            style={[styles.tabBtn, tab === tabKey && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
              {tabKey === 'discover'
                ? t('memorial.tabDiscover')
                : tabKey === 'friends'
                  ? t('memorial.tabFriends')
                  : tabRequests}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : tab === 'discover' ? (
        matches.length === 0 ? (
          <Card>
            <Text style={styles.empty}>{t('memorial.emptyDiscover')}</Text>
          </Card>
        ) : (
          matches.map((u) => (
            <Card key={u.id}>
              <View style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.nickname}</Text>
                  {u.mbti && (
                    <Text style={styles.userMeta}>
                      {t('common.mbti')} · {u.mbti}
                    </Text>
                  )}
                  <Text style={styles.userScores}>{scoreSummary(u.scores)}</Text>
                </View>
                <View style={styles.compatBadge}>
                  <Text style={styles.compatText}>{u.compatibility}%</Text>
                  <Text style={styles.compatLabel}>{t('memorial.compatibility')}</Text>
                </View>
              </View>
              <Button
                title={t('memorial.requestChat')}
                variant="secondary"
                onPress={() => requestChat(u.id)}
                style={{ marginTop: 12 }}
              />
            </Card>
          ))
        )
      ) : tab === 'friends' ? (
        friends.length === 0 ? (
          <Card>
            <Text style={styles.empty}>{t('memorial.emptyFriends')}</Text>
          </Card>
        ) : (
          friends.map((f) => (
            <Pressable key={f.id} onPress={() => router.push(`/social/chat/${f.id}`)}>
              <Card>
                <Text style={styles.userName}>{f.nickname}</Text>
                {f.mbti && (
                  <Text style={styles.userMeta}>
                    {t('common.mbti')} · {f.mbti}
                  </Text>
                )}
                <Text style={styles.userScores}>{scoreSummary(f.scores)}</Text>
              </Card>
            </Pressable>
          ))
        )
      ) : incoming.length === 0 ? (
        <Card>
          <Text style={styles.empty}>{t('memorial.emptyRequests')}</Text>
        </Card>
      ) : (
        incoming.map((r) => (
          <Card key={r.id}>
            <Text style={styles.userName}>{r.user.nickname}</Text>
            <Text style={styles.userScores}>{scoreSummary(r.user.scores)}</Text>
            {r.message && <Text style={styles.reqMsg}>「{r.message}」</Text>}
            <View style={styles.reqActions}>
              <Button
                title={t('memorial.reject')}
                variant="secondary"
                onPress={() => respond(r.id, false)}
                style={styles.reqBtn}
              />
              <Button title={t('memorial.accept')} onPress={() => respond(r.id, true)} style={styles.reqBtn} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md },
  subtitle: { ...typography.caption, marginBottom: spacing.lg },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { ...typography.title, fontSize: 16 },
  switchHint: { ...typography.small, marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 8, marginVertical: spacing.md },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.backgroundSecondary, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primaryMuted },
  tabText: { ...typography.caption, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  userRow: { flexDirection: 'row', alignItems: 'flex-start' },
  userName: { ...typography.title, fontSize: 17 },
  userMeta: { ...typography.caption, marginTop: 4 },
  userScores: { ...typography.small, marginTop: 6, color: colors.textSecondary },
  compatBadge: { alignItems: 'center', backgroundColor: colors.primaryMuted, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  compatText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  compatLabel: { ...typography.small, color: colors.primary },
  reqMsg: { ...typography.caption, marginTop: 8, fontStyle: 'italic' },
  reqActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  reqBtn: { flex: 1 },
});
