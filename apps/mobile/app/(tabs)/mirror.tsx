import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { Button } from '@/components/ui/Button';
import { KeyboardChatLayout } from '@/components/ui/KeyboardChatLayout';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { streamBotChat } from '@/lib/chat-stream';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme/tokens';

type Message = { role: string; content: string; createdAt?: string };

function buildChatHistory(msgs: Message[]): { role: string; content: string }[] {
  return msgs
    .slice(0, -2)
    .filter((m) => m.content?.trim() && (m.role === 'user' || m.role === 'assistant'))
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content }));
}

export default function MirrorScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ q?: string; planCardId?: string; planContext?: string }>();
  const pendingQuestion = typeof params.q === 'string' && params.q ? params.q : undefined;
  const planCardId = typeof params.planCardId === 'string' && params.planCardId ? params.planCardId : undefined;
  const initialPlanContext = useRef<string | undefined>(undefined);
  const planFollowUpUsed = useRef(false);
  if (!initialPlanContext.current) {
    const ctx = typeof params.planContext === 'string' && params.planContext ? params.planContext : undefined;
    if (ctx) initialPlanContext.current = ctx;
  }
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [offline, setOffline] = useState(false);
  const [init, setInit] = useState(true);
  const listRef = useRef<FlatList>(null);
  const { token, hydrated } = useAuthStore();
  const initialized = useRef(false);
  const pendingSent = useRef(false);

  const loadSession = useCallback(
    async (replaceMessages: boolean) => {
      if (!hydrated || !token) {
        throw new Error(t('mirror.authLoading'));
      }
      const sessions = await api.get<{ _id: string }[]>('/bot/sessions');
      let sid: string;
      let loaded: Message[];

      if (sessions.length > 0) {
        const s = await api.get<{ _id: string; messages: Message[] }>(`/bot/sessions/${sessions[0]._id}`);
        sid = s._id;
        loaded = s.messages.length > 0 ? s.messages : [{ role: 'assistant', content: t('mirror.greet1') }];
      } else {
        const created = await api.post<{ _id: string }>('/bot/sessions');
        sid = created._id;
        loaded = [{ role: 'assistant', content: t('mirror.greet2') }];
      }

      setSessionId(sid);
      if (replaceMessages) {
        setMessages(loaded);
      }
      setOffline(false);
      return sid;
    },
    [hydrated, token, t],
  );

  const getOrCreateSessionId = useCallback(async (): Promise<string> => {
    if (sessionId && sessionId !== 'local') return sessionId;
    return loadSession(false);
  }, [sessionId, loadSession]);

  const reloadSession = useCallback(
    async (force = false) => {
      if (!hydrated) return;
      setInit(true);
      try {
        await loadSession(force || messages.length === 0);
      } catch {
        setSessionId('local');
        setOffline(true);
        setMessages([{ role: 'assistant', content: t('mirror.offlineReply') }]);
      } finally {
        setInit(false);
      }
    },
    [loadSession, hydrated, messages.length, t],
  );

  useEffect(() => {
    if (!hydrated || initialized.current) return;
    initialized.current = true;
    reloadSession(true);
  }, [hydrated, reloadSession]);

  useFocusEffect(
    useCallback(() => {
      if (!pendingQuestion || pendingSent.current) return;
      pendingSent.current = true;
      setInput(pendingQuestion);
    }, [pendingQuestion]),
  );

  const persistExchange = async (userText: string, assistantText: string) => {
    try {
      const sid = await getOrCreateSessionId();
      await api.post(`/bot/sessions/${sid}/messages/append`, {
        messages: [
          { role: 'user', content: userText },
          { role: 'assistant', content: assistantText },
        ],
      });
    } catch {
      /* keep local messages even if persist fails */
    }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      const usePlanFollowUp = !!initialPlanContext.current && !planFollowUpUsed.current;

      if (usePlanFollowUp) {
        const res = await api.post<{ reply: string }>('/followup/ask', {
          message: text,
          planCardId: planCardId || undefined,
          planContext: initialPlanContext.current,
          history: buildChatHistory(messages),
          layer: 1,
        });
        planFollowUpUsed.current = true;
        setMessages((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, content: res.reply };
          }
          return next;
        });
        await persistExchange(text, res.reply);
        return;
      }

      let sid = sessionId;
      if (!sid || sid === 'local') {
        sid = await getOrCreateSessionId();
      }
      await streamBotChat(sid, text, (delta) => {
        setMessages((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, content: last.content + delta };
          }
          return next;
        });
        listRef.current?.scrollToEnd({ animated: false });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('mirror.streamInterrupted');
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          next[next.length - 1] = { ...last, content: msg };
        }
        return next;
      });
      if (msg.includes('网络') || msg.includes('Network') || msg.includes('超时') || msg.includes('timeout')) {
        setOffline(true);
      }
    } finally {
      setStreaming(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (init || !hydrated) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  return (
    <KeyboardChatLayout>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('mirror.title')}</Text>
          {offline ? (
            <Pressable onPress={() => reloadSession(true)} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t('mirror.reconnect')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.subtitle}>{offline ? t('mirror.offline') : t('mirror.subtitle')}</Text>
      </View>
      <FlatList
        ref={listRef}
        style={styles.listFlex}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ChatBubble
            role={item.role as 'user' | 'assistant'}
            content={item.content || (streaming ? '…' : '')}
          />
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={t('mirror.placeholder')}
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!streaming}
          onSubmitEditing={() => send()}
        />
        <Button title={t('common.send')} onPress={() => send()} loading={streaming} style={styles.sendBtn} />
      </View>
    </KeyboardChatLayout>
  );
}

const styles = StyleSheet.create({
  listFlex: { flex: 1 },
  header: { paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.hero, fontSize: 24 },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
  },
  retryText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  subtitle: { ...typography.caption, marginTop: 4 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 16 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  sendBtn: { height: 44, minWidth: 72 },
});
