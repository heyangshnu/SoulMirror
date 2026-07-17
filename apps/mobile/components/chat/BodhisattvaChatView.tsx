import { useLocalSearchParams, useSegments, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBodhisattvaChat } from '@/hooks/useBodhisattvaChat';
import { guanxinColors, guanxinSpacing, guanxinTypography } from '@/theme/guanxin';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';

type InitGate = {
  canChat?: boolean;
  agentMode?: string;
  bootstrapReady?: boolean;
  phase?: string;
  fuxiNodesDone?: number;
};

/** Strip internal agent protocol tags from user-visible bubbles. */
function visibleChatText(text: string) {
  return text
    .replace(/<writeback_candidate>[\s\S]*?<\/writeback_candidate>/gi, '')
    .replace(/<\/?user_visible>/gi, '')
    .replace(/<\/?writeback_candidate>/gi, '')
    .trim();
}

export function BodhisattvaChatView() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const isTabChat = segments[0] === '(tabs)' && segments[1] === 'chat';
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [initGate, setInitGate] = useState<InitGate | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList>(null);
  const prefillSentRef = useRef(false);
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const {
    connected,
    agentReady,
    connecting,
    error,
    messages,
    isStreaming,
    historyLoading,
    connect,
    reconnect,
    sendMessage,
  } = useBodhisattvaChat();

  const refreshInitGate = useCallback(() => {
    api
      .get<InitGate>('/agent/init-status')
      .then(setInitGate)
      .catch(() => setInitGate(null));
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshInitGate();
    }, [refreshInitGate]),
  );

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Soft hint only — never block sending. Analysis enriches chat in the background.
  const showAnalysisHint =
    initGate?.agentMode === 'claude' && initGate.bootstrapReady === false;

  useEffect(() => {
    if (!showAnalysisHint) return undefined;
    const timer = setInterval(refreshInitGate, 8000);
    return () => clearInterval(timer);
  }, [showAnalysisHint, refreshInitGate]);

  const showConnectingBanner = connecting && !connected;
  const showErrorBanner = !connected && !connecting && !!error;

  useEffect(() => {
    if (!prefill || prefillSentRef.current || !connected || !agentReady || typeof prefill !== 'string')
      return;
    prefillSentRef.current = true;
    sendMessage(prefill);
  }, [prefill, connected, agentReady, sendMessage]);

  useEffect(() => {
    if (messages.length) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, isStreaming]);

  const onSend = () => {
    if (!input.trim()) return;
    if (sendMessage(input)) setInput('');
  };

  // Android: pan mode + explicit lift (resize is unreliable with tabs / edge-to-edge).
  // iOS: KeyboardAvoidingView handles most of it; still keep a small bottom pad when needed.
  const androidLift = Platform.OS === 'android' ? keyboardHeight : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {isTabChat ? (
        <View style={styles.tabHeader}>
          <Text style={styles.tabHeaderTitle}>{t('chat.bodhisattvaTitle')}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={isTabChat ? 0 : insets.top + 44}
      >
        <View style={[styles.flex, androidLift > 0 ? { paddingBottom: androidLift } : null]}>
          {showConnectingBanner ? (
            <View style={styles.banner}>
              <ActivityIndicator color={guanxinColors.primary} />
              <Text style={styles.bannerText}>{t('chat.connecting')}</Text>
            </View>
          ) : showErrorBanner ? (
            <Pressable style={styles.banner} onPress={reconnect}>
              <Text style={styles.bannerText}>{error}</Text>
              <Text style={styles.retryText}>{t('chat.tapRetry')}</Text>
            </Pressable>
          ) : showAnalysisHint ? (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>{t('chat.analysisPendingHint')}</Text>
            </View>
          ) : null}

          {historyLoading ? (
            <View style={styles.streamingBar}>
              <ActivityIndicator size="small" color={guanxinColors.primary} />
              <Text style={styles.streamingText}>{t('chat.loadingHistory')}</Text>
            </View>
          ) : null}

          {isStreaming && !historyLoading ? (
            <View style={styles.streamingBar}>
              <ActivityIndicator size="small" color={guanxinColors.primary} />
              <Text style={styles.streamingText}>{t('chat.replying')}</Text>
            </View>
          ) : null}

          <FlatList
            ref={listRef}
            style={styles.flex}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const text = visibleChatText(item.text);
              if (!text && !item.streaming) return <View />;
              return (
                <View
                  style={[
                    styles.bubble,
                    item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text style={item.role === 'user' ? styles.userText : styles.assistantText}>
                    {text}
                    {item.streaming ? '…' : ''}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>{t('chat.emptyHint')}</Text>}
          />

          <View
            style={[
              styles.inputRow,
              {
                paddingBottom:
                  androidLift > 0 ? guanxinSpacing.sm : Math.max(insets.bottom, guanxinSpacing.sm),
              },
            ]}
          >
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={t('chat.inputPlaceholder')}
              placeholderTextColor={guanxinColors.textMuted}
              multiline
              editable={true}
              onFocus={() => {
                setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
              }}
            />
            <Pressable
              style={[styles.sendBtn, !input.trim() && styles.sendDisabled]}
              onPress={onSend}
              disabled={!input.trim()}
            >
              <Text style={styles.sendLabel}>{t('chat.send')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: guanxinColors.background },
  flex: { flex: 1 },
  tabHeader: {
    paddingHorizontal: guanxinSpacing.md,
    paddingBottom: guanxinSpacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: guanxinColors.border,
    backgroundColor: guanxinColors.background,
  },
  tabHeaderTitle: {
    ...guanxinTypography.title,
    fontSize: 17,
    textAlign: 'center',
  },
  banner: {
    padding: guanxinSpacing.sm,
    alignItems: 'center',
    backgroundColor: guanxinColors.primaryMuted,
    gap: 6,
  },
  bannerText: { ...guanxinTypography.caption, color: guanxinColors.primary, textAlign: 'center' },
  retryText: {
    ...guanxinTypography.caption,
    color: guanxinColors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  streamingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: guanxinSpacing.md,
    paddingVertical: guanxinSpacing.xs,
    backgroundColor: guanxinColors.backgroundSecondary,
  },
  streamingText: { ...guanxinTypography.caption, color: guanxinColors.textSecondary },
  list: { padding: guanxinSpacing.md, flexGrow: 1, paddingBottom: guanxinSpacing.sm },
  empty: { ...guanxinTypography.body, textAlign: 'center', marginTop: guanxinSpacing.xxl },
  bubble: {
    maxWidth: '85%',
    padding: guanxinSpacing.md,
    borderRadius: 16,
    marginBottom: guanxinSpacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: guanxinColors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: guanxinColors.card,
    borderWidth: 1,
    borderColor: guanxinColors.border,
  },
  userText: { ...guanxinTypography.body, color: '#FFF' },
  assistantText: guanxinTypography.body,
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: guanxinSpacing.md,
    paddingTop: guanxinSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: guanxinColors.border,
    backgroundColor: guanxinColors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    ...guanxinTypography.body,
    paddingHorizontal: guanxinSpacing.md,
    paddingVertical: guanxinSpacing.sm,
    backgroundColor: guanxinColors.backgroundSecondary,
    borderRadius: 20,
    marginRight: guanxinSpacing.sm,
  },
  sendBtn: {
    backgroundColor: guanxinColors.primary,
    paddingHorizontal: guanxinSpacing.md,
    paddingVertical: guanxinSpacing.sm + 2,
    borderRadius: 20,
    marginBottom: 2,
  },
  sendDisabled: { opacity: 0.45 },
  sendLabel: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
