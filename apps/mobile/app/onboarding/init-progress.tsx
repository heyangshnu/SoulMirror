import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { connectAgentStream } from '@/lib/agent-ws';
import { colors, spacing, typography } from '@/theme/tokens';

type InitStatus = {
  phase: string;
  progress: number;
  fuxiNodesDone: number;
  fuxiNodesTotal: number;
  nodes: Array<{ code: string; title: string; done: boolean }>;
  lastError?: string;
  canChat?: boolean;
  bootstrapReady?: boolean;
};

export default function InitProgressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [status, setStatus] = useState<InitStatus | null>(null);
  const [wsHint, setWsHint] = useState('');

  const refresh = useCallback(() => {
    api.get<InitStatus>('/agent/init-status').then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const conn = connectAgentStream({
      onEvent: (e) => {
        if (e.type === 'init_progress') {
          setWsHint(`${String(e.node)} (${String(e.done)}/${String(e.total)})`);
          refresh();
        }
        if (e.type === 'init_chat_ready') {
          setWsHint(t('init.chatReadyHint'));
          refresh();
        }
        if (e.type === 'init_done' || e.type === 'init_partial') {
          refresh();
          if (e.type === 'init_done') {
            setTimeout(() => router.replace('/(tabs)/today'), 800);
          }
        }
        if (e.type === 'init_failed') {
          setWsHint(String(e.error ?? 'init failed'));
          refresh();
        }
      },
    });
    return () => conn?.close();
  }, [refresh, router, t]);

  if (!status) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  const fullyDone = status.phase === 'done';
  const canEnterToday =
    status.canChat ||
    status.bootstrapReady ||
    ['chat_ready', 'partial', 'done'].includes(status.phase);

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('init.title')}</Text>
      <Text style={styles.subtitle}>{t('init.subtitle')}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${status.progress}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {status.fuxiNodesDone}/{status.fuxiNodesTotal} · {status.progress}%
      </Text>
      {wsHint ? <Text style={styles.hint}>{wsHint}</Text> : null}
      {status.lastError && status.phase === 'failed' ? (
        <Text style={styles.error}>{status.lastError}</Text>
      ) : null}
      {status.phase === 'partial' && status.lastError ? (
        <Text style={styles.warn}>{status.lastError}</Text>
      ) : null}

      <View style={styles.nodeList}>
        {status.nodes.map((n) => (
          <View key={n.code} style={styles.nodeRow}>
            <Text style={[styles.nodeCode, n.done && styles.nodeDone]}>{n.code}</Text>
            <Text style={[styles.nodeTitle, n.done && styles.nodeDone]}>{n.title}</Text>
            <Text style={styles.nodeMark}>{n.done ? '✓' : '…'}</Text>
          </View>
        ))}
      </View>

      {fullyDone || canEnterToday ? (
        <Button title={t('init.enterToday')} onPress={() => router.replace('/(tabs)/today')} />
      ) : (
        <Button title={t('init.retry')} variant="secondary" onPress={() => api.post('/agent/init', {})} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md },
  subtitle: { ...typography.caption, marginBottom: spacing.lg, lineHeight: 22 },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  progressText: { ...typography.caption, marginBottom: spacing.md },
  hint: { ...typography.small, color: colors.primary, marginBottom: spacing.sm },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.md },
  warn: { ...typography.caption, color: colors.primary, marginBottom: spacing.md },
  nodeList: { marginTop: spacing.md, marginBottom: spacing.xl },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nodeCode: { width: 44, ...typography.small, fontWeight: '700' },
  nodeTitle: { flex: 1, ...typography.body, fontSize: 15 },
  nodeMark: { width: 24, textAlign: 'right', color: colors.sage },
  nodeDone: { color: colors.textMuted },
});
