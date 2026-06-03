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
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme/tokens';

type Message = { role: string; senderId: string; content: string; createdAt?: string };

export default function FriendChatScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const myId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    if (!friendId) return;
    setLoading(true);
    try {
      const chat = await api.get<{ messages: Message[] }>(`/social/chats/${friendId}`);
      setMessages(chat.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const send = async () => {
    if (!input.trim() || !friendId) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    setMessages((m) => [...m, { role: 'user', senderId: myId ?? '', content: text }]);
    try {
      await api.post(`/social/chats/${friendId}/messages`, { content: text });
    } catch {
      alert('发送失败');
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '好友聊天', headerTintColor: colors.primary }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ChatBubble
                role={item.senderId === myId ? 'user' : 'assistant'}
                content={item.content}
              />
            )}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<Text style={styles.empty}>开始你们的第一次对话吧</Text>}
          />
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="输入消息…"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Button title="发送" onPress={send} loading={sending} style={styles.sendBtn} />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: 16 },
  empty: { ...typography.caption, textAlign: 'center', marginTop: 40 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
