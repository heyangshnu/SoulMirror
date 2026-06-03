import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { streamBotChat } from '@/lib/chat-stream';
import { colors, spacing, typography } from '@/theme/tokens';

type Message = { role: string; content: string; createdAt?: string };

export default function MirrorScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [init, setInit] = useState(true);
  const listRef = useRef<FlatList>(null);

  const ensureSession = useCallback(async () => {
    const sessions = await api.get<{ _id: string }[]>('/bot/sessions');
    if (sessions.length > 0) {
      const s = await api.get<{ _id: string; messages: Message[] }>(`/bot/sessions/${sessions[0]._id}`);
      setSessionId(s._id);
      setMessages(s.messages.length > 0 ? s.messages : [
        { role: 'assistant', content: '嗨，最近怎么样？有什么想聊的？' },
      ]);
    } else {
      const created = await api.post<{ _id: string }>('/bot/sessions');
      setSessionId(created._id);
      setMessages([
        { role: 'assistant', content: '嗨，我是心镜。有什么想聊的，随时说。' },
      ]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setInit(true);
      ensureSession()
        .catch(() => {
          setSessionId('local');
          setMessages([
            { role: 'assistant', content: '你好，我是心镜。请先登录并启动后端服务，即可开始对话。' },
          ]);
        })
        .finally(() => setInit(false));
    }, [ensureSession]),
  );

  const send = async () => {
    if (!input.trim() || !sessionId || sessionId === 'local' || streaming) return;
    const text = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      await streamBotChat(sessionId, text, (delta) => {
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
    } catch {
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          next[next.length - 1] = { ...last, content: '连接暂时中断，请稍后再试。' };
        }
        return next;
      });
    } finally {
      setStreaming(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  if (init) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.title}>心镜</Text>
        <Text style={styles.subtitle}>你的专属 AI 陪伴 · 流式对话</Text>
      </View>
      <FlatList
        ref={listRef}
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
          value={input}
          onChangeText={setInput}
          multiline
          editable={!streaming}
        />
        <Button title="发送" onPress={send} loading={streaming} style={styles.sendBtn} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: 12 },
  title: { ...typography.hero, fontSize: 24 },
  subtitle: { ...typography.caption },
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
  },
  sendBtn: { height: 44, minWidth: 72 },
});
