import { useCallback, useEffect, useRef, useState } from 'react';
import {
  connectAgentStream,
  isAgentConnected,
  isAgentDone,
  isAgentTextDelta,
  sendAgentMessage,
  type AgentWsConnection,
  type AgentWsEvent,
} from '@/lib/agent-ws';
import { api } from '@/lib/api';
import { parseTranscriptContent } from '@/lib/parse-transcript';
import { useAuthStore } from '@/store/auth';
import { useBodhisattvaChatStore, type ChatMessage } from '@/store/bodhisattva-chat';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatBatchMessage(texts: string[]): string {
  if (texts.length === 1) return texts[0];
  return `用户连续发送了 ${texts.length} 条消息，请一并回应：\n\n${texts.map((t, i) => `${i + 1}. ${t}`).join('\n\n')}`;
}

/** Shared WS session survives leaving the chat screen. */
let sharedConn: AgentWsConnection | null = null;
let sharedIntentionalClose = false;
let sharedReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let sharedReconnectAttempt = 0;
const sharedListeners = new Set<(event: AgentWsEvent) => void>();
const sharedLifecycleListeners = new Set<(state: SharedLifecycle) => void>();

type SharedLifecycle = {
  connected: boolean;
  agentReady: boolean;
  connecting: boolean;
  error: string | null;
};

let sharedLifecycle: SharedLifecycle = {
  connected: false,
  agentReady: false,
  connecting: false,
  error: null,
};

function emitLifecycle() {
  for (const listener of sharedLifecycleListeners) listener(sharedLifecycle);
}

function emitSharedEvent(event: AgentWsEvent) {
  for (const listener of sharedListeners) listener(event);
}

function ensureSharedConnection(onError: (msg: string) => void) {
  if (sharedConn) return sharedConn;

  sharedLifecycle = { ...sharedLifecycle, connecting: true, error: null };
  emitLifecycle();
  sharedIntentionalClose = false;

  sharedConn = connectAgentStream({
    onOpen: () => {
      sharedLifecycle = { ...sharedLifecycle, connected: true, connecting: false, error: null };
      sharedReconnectAttempt = 0;
      emitLifecycle();
    },
    onClose: () => {
      sharedConn = null;
      sharedLifecycle = {
        ...sharedLifecycle,
        connected: false,
        agentReady: false,
        connecting: false,
      };
      emitLifecycle();
      if (!sharedIntentionalClose && sharedReconnectAttempt < 5) {
        const delay = Math.min(1000 * 2 ** sharedReconnectAttempt, 15000);
        sharedReconnectAttempt += 1;
        sharedReconnectTimer = setTimeout(() => ensureSharedConnection(onError), delay);
      }
    },
    onError: (msg) => {
      onError(msg);
      sharedLifecycle = { ...sharedLifecycle, error: msg, connecting: false };
      emitLifecycle();
    },
    onEvent: (event) => {
      if (isAgentConnected(event)) {
        sharedLifecycle = { ...sharedLifecycle, agentReady: true };
        emitLifecycle();
      }
      emitSharedEvent(event);
    },
  });

  if (!sharedConn) {
    sharedLifecycle = { ...sharedLifecycle, connecting: false };
    emitLifecycle();
  }

  return sharedConn;
}

function closeSharedConnection() {
  sharedIntentionalClose = true;
  if (sharedReconnectTimer) clearTimeout(sharedReconnectTimer);
  sharedConn?.close();
  sharedConn = null;
  sharedLifecycle = { connected: false, agentReady: false, connecting: false, error: null };
  emitLifecycle();
}

export function useBodhisattvaChat() {
  const token = useAuthStore((s) => s.token);
  const messages = useBodhisattvaChatStore((s) => s.messages);
  const transcriptLoaded = useBodhisattvaChatStore((s) => s.transcriptLoaded);
  const setMessages = useBodhisattvaChatStore((s) => s.setMessages);
  const appendMessage = useBodhisattvaChatStore((s) => s.appendMessage);
  const updateMessages = useBodhisattvaChatStore((s) => s.updateMessages);
  const markTranscriptLoaded = useBodhisattvaChatStore((s) => s.markTranscriptLoaded);
  const clearChat = useBodhisattvaChatStore((s) => s.clearChat);

  const [connected, setConnected] = useState(sharedLifecycle.connected);
  const [agentReady, setAgentReady] = useState(sharedLifecycle.agentReady);
  const [connecting, setConnecting] = useState(sharedLifecycle.connecting);
  const [error, setError] = useState<string | null>(sharedLifecycle.error);
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [backgroundStatus, setBackgroundStatus] = useState<string | null>(null);

  const assistantBufRef = useRef('');
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOutboundRef = useRef<string[]>([]);
  const isStreamingRef = useRef(false);

  const clearStreamTimer = useCallback(() => {
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
  }, []);

  const appendAssistantDelta = useCallback(
    (delta: string) => {
      assistantBufRef.current += delta;
      const text = assistantBufRef.current;
      updateMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.streaming) {
          return [...prev.slice(0, -1), { ...last, text }];
        }
        return [...prev, { id: uid(), role: 'assistant', text, streaming: true }];
      });
    },
    [updateMessages],
  );

  const setAssistantFull = useCallback(
    (text: string) => {
      clearStreamTimer();
      assistantBufRef.current = text;
      updateMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.streaming) {
          return [...prev.slice(0, -1), { ...last, text, streaming: false }];
        }
        return [...prev, { id: uid(), role: 'assistant', text, streaming: false }];
      });
      isStreamingRef.current = false;
      setIsStreaming(false);
    },
    [clearStreamTimer, updateMessages],
  );

  const finalizeAssistant = useCallback(() => {
    clearStreamTimer();
    assistantBufRef.current = '';
    updateMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && last.streaming) {
        return [...prev.slice(0, -1), { ...last, streaming: false }];
      }
      return prev;
    });
    isStreamingRef.current = false;
    setIsStreaming(false);
  }, [clearStreamTimer, updateMessages]);

  const armStreamTimer = useCallback(() => {
    clearStreamTimer();
    streamTimerRef.current = setTimeout(() => {
      setError('回复超时，请重试');
      finalizeAssistant();
    }, 5 * 60 * 1000);
  }, [clearStreamTimer, finalizeAssistant]);

  const dispatchOutbound = useCallback(
    (texts: string[]) => {
      const conn = sharedConn ?? ensureSharedConnection(setError);
      if (!conn || conn.readyState() !== WebSocket.OPEN) {
        setError('连接未就绪，请稍候再试');
        pendingOutboundRef.current.unshift(...texts);
        return false;
      }

      const payload = formatBatchMessage(texts);
      assistantBufRef.current = '';
      isStreamingRef.current = true;
      setIsStreaming(true);
      armStreamTimer();

      const sent = conn.send(sendAgentMessage(payload));
      if (!sent) {
        clearStreamTimer();
        isStreamingRef.current = false;
        setIsStreaming(false);
        pendingOutboundRef.current.unshift(...texts);
        setError('消息发送失败，请检查连接');
        return false;
      }
      return true;
    },
    [armStreamTimer, clearStreamTimer],
  );

  const flushPendingOutbound = useCallback(() => {
    if (isStreamingRef.current || pendingOutboundRef.current.length === 0) return;
    const batch = pendingOutboundRef.current.splice(0);
    dispatchOutbound(batch);
  }, [dispatchOutbound]);

  const handleEvent = useCallback(
    (event: AgentWsEvent) => {
      if (isAgentTextDelta(event)) {
        isStreamingRef.current = true;
        setIsStreaming(true);
        appendAssistantDelta(event.text);
        return;
      }
      if (isAgentDone(event)) {
        if (typeof event.fullText === 'string' && event.fullText) {
          setAssistantFull(event.fullText);
        } else {
          finalizeAssistant();
        }
        flushPendingOutbound();
        return;
      }
      if (event.type === 'background') {
        setBackgroundStatus(String(event.status ?? 'working'));
        return;
      }
      if (event.type === 'turn_done' || event.type === 'message_done') {
        finalizeAssistant();
        flushPendingOutbound();
        return;
      }
      if (event.type === 'done') {
        if (typeof event.fullText === 'string' && event.fullText) {
          setAssistantFull(event.fullText);
        } else {
          finalizeAssistant();
        }
        flushPendingOutbound();
        return;
      }
      if (event.type === 'error' && typeof event.message === 'string') {
        setError(event.message);
        updateMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.streaming && !last.text) {
            return [...prev.slice(0, -1), { ...last, text: event.message, streaming: false }];
          }
          if (last?.role === 'user') {
            return [...prev, { id: uid(), role: 'assistant', text: event.message, streaming: false }];
          }
          return prev;
        });
        finalizeAssistant();
        flushPendingOutbound();
      }
    },
    [appendAssistantDelta, finalizeAssistant, flushPendingOutbound, setAssistantFull, updateMessages],
  );

  const connect = useCallback(() => {
    ensureSharedConnection(setError);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return false;

      setError(null);
      appendMessage({ id: uid(), role: 'user', text: trimmed });

      if (isStreamingRef.current) {
        pendingOutboundRef.current.push(trimmed);
        return true;
      }

      return dispatchOutbound([trimmed]);
    },
    [appendMessage, dispatchOutbound],
  );

  useEffect(() => {
    sharedListeners.add(handleEvent);
    return () => {
      sharedListeners.delete(handleEvent);
    };
  }, [handleEvent]);

  useEffect(() => {
    const onLifecycle = (state: SharedLifecycle) => {
      setConnected(state.connected);
      setAgentReady(state.agentReady);
      setConnecting(state.connecting);
      setError(state.error);
    };
    sharedLifecycleListeners.add(onLifecycle);
    onLifecycle(sharedLifecycle);
    return () => {
      sharedLifecycleListeners.delete(onLifecycle);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      closeSharedConnection();
      clearChat();
      return;
    }
    if (transcriptLoaded || messages.length > 0) return;

    let cancelled = false;
    setHistoryLoading(true);
    api
      .get<{ content?: string }>('/agent/transcript?limit=100')
      .then((data) => {
        if (cancelled) return;
        const parsed = parseTranscriptContent(data.content ?? '');
        if (parsed.length) setMessages(parsed);
        markTranscriptLoaded();
      })
      .catch(() => {
        if (!cancelled) markTranscriptLoaded();
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, transcriptLoaded, messages.length, setMessages, markTranscriptLoaded, clearChat]);

  return {
    connected,
    agentReady,
    connecting,
    error,
    messages,
    isStreaming,
    historyLoading,
    backgroundStatus,
    connect,
    sendMessage,
  };
}
