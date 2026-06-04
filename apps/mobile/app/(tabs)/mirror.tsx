import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { Button } from '@/components/ui/Button';
import { KeyboardChatLayout } from '@/components/ui/KeyboardChatLayout';
import { api } from '@/lib/api';
import { streamBotChat } from '@/lib/chat-stream';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme/tokens';

type Message = { role: string; content: string; createdAt?: string };

export default function MirrorScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [offline, setOffline] = useState(false);
  const [init, setInit] = useState(true);
  const listRef = useRef<FlatList>(null);
  const { token, hydrated } = useAuthStore();

  const ensureSession = useCallback(async (): Promise<string> => {
    if (!hydrated || !token) {
      throw new Error('登录状态加载中，请稍后重试');
    }
    const sessions = await api.get<{ _id: string }[]>('/bot/sessions');
    if (sessions.length > 0) {
      const s = await api.get<{ _id: string; messages: Message[] }>(`/bot/sessions/${sessions[0]._id}`);
      setSessionId(s._id);
      setMessages(
        s.messages.length > 0
          ? s.messages
          : [{ role: 'assistant', content: '嗨，最近怎么样？有什么想聊的？' }],
      );
      setOffline(false);
      return s._id;
    }
    const created = await api.post<{ _id: string }>('/bot/sessions');
    setSessionId(created._id);
    setMessages([{ role: 'assistant', content: '嗨，我是心镜。有什么想聊的，随时说。' }]);
    setOffline(false);
    return created._id;
  }, [hydrated, token]);

  const reloadSession = useCallback(async () => {
    if (!hydrated) return;
    setInit(true);
    try {
      await ensureSession();
    } catch {
      setSessionId('local');
      setOffline(true);
      setMessages([
        {
          role: 'assistant',
          content: '暂时连不上服务器。请切换 WiFi/流量后点上方「重新连接」，或在「我的」页运行网络诊断。',
        },
      ]);
    } finally {
      setInit(false);
    }
  }, [ensureSession, hydrated]);

  useFocusEffect(
    useCallback(() => {
      if (!hydrated) return;
      reloadSession();
    }, [reloadSession, hydrated]),
  );

  const send = async () => {
    if (!input.trim() || streaming) return;

    const text = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      let sid = sessionId;
      if (!sid || sid === 'local') {
        sid = await ensureSession();
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
      const msg = e instanceof Error ? e.message : '连接暂时中断，请稍后再试。';
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          next[next.length - 1] = { ...last, content: msg };
        }
        return next;
      });
      if (msg.includes('网络') || msg.includes('超时')) {
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
          <Text style={styles.title}>心镜</Text>
          {offline ? (
            <Pressable onPress={reloadSession} style={styles.retryBtn}>
              <Text style={styles.retryText}>重新连接</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.subtitle}>
          {offline ? '未连接服务器 · 可切换 WiFi/流量后点重新连接' : '你的专属 AI 陪伴 · 流式对话'}
        </Text>
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
          placeholder="说说你的感受…"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          editable={!streaming}
          onSubmitEditing={send}
        />
        <Button title="发送" onPress={send} loading={streaming} style={styles.sendBtn} />
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
