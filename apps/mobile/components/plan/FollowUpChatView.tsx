import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { KeyboardChatLayout } from '@/components/ui/KeyboardChatLayout';
import { useFollowUpChat } from '@/hooks/useFollowUpChat';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = {
  planContext?: string;
  planCardId?: string;
  pendingQuestion?: string;
};

export function FollowUpChatView({ planContext, planCardId, pendingQuestion }: Props) {
  const { t } = useTranslation();
  const { messages, streaming, ready, init, send } = useFollowUpChat(planContext, planCardId);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const pendingSent = useRef(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (pendingQuestion && ready && !pendingSent.current) {
      pendingSent.current = true;
      setInput(pendingQuestion);
    }
  }, [pendingQuestion, ready]);

  const onSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput('');
    await send(msg);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardChatLayout hasHeader style={styles.root}>
      <Text style={styles.sub}>{t('planReport.followUpSub')}</Text>

      <FlatList
        ref={listRef}
        style={styles.list}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={messages.length === 0 ? styles.listEmpty : styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ChatBubble
            role={item.role as 'user' | 'assistant'}
            content={item.content || (streaming ? '…' : '')}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('planReport.followUpEmpty')}</Text>
          </View>
        }
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
          onSubmitEditing={() => onSend()}
        />
        <Button title={t('common.send')} onPress={() => onSend()} loading={streaming} style={styles.sendBtn} />
      </View>
    </KeyboardChatLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sub: {
    ...typography.caption,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 8,
    lineHeight: 20,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 12 },
  listEmpty: { flexGrow: 1, paddingHorizontal: spacing.lg },
  empty: { paddingTop: spacing.md, gap: 8 },
  emptyText: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 22 },
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.backgroundSecondary,
    color: colors.text,
  },
  sendBtn: { height: 44, minWidth: 72 },
});
