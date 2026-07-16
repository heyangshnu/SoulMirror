import { API_BASE } from './api';
import { useAuthStore } from '@/store/auth';

function resolveAgentWsBase(): string {
  const explicit = process.env.EXPO_PUBLIC_AGENT_WS_URL;
  if (explicit) return explicit.replace(/\/?$/, '');

  const api = API_BASE.replace(/\/v1\/?$/, '');
  if (api.startsWith('https://')) {
    return `${api.replace('https://', 'wss://')}/v1/agent/stream`;
  }
  return `${api.replace('http://', 'ws://')}/v1/agent/stream`;
}

export type AgentWsEvent = {
  type: string;
  at?: string;
  [key: string]: unknown;
};

export type AgentWsHandlers = {
  onEvent?: (event: AgentWsEvent) => void;
  onOpen?: () => void;
  onClose?: (code: number, reason: string) => void;
  onError?: (message: string) => void;
};

export type AgentWsConnection = {
  send: (payload: Record<string, unknown>) => boolean;
  close: () => void;
  readyState: () => number;
};

export function connectAgentStream(handlers: AgentWsHandlers = {}): AgentWsConnection | null {
  const token = useAuthStore.getState().token;
  if (!token) {
    handlers.onError?.('未登录');
    return null;
  }

  const url = `${resolveAgentWsBase()}?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);

  ws.onopen = () => handlers.onOpen?.();

  ws.onmessage = (evt) => {
    try {
      const event = JSON.parse(String(evt.data)) as AgentWsEvent;
      handlers.onEvent?.(event);
    } catch {
      handlers.onError?.('无法解析 agent 事件');
    }
  };

  ws.onerror = () => handlers.onError?.('WSS 连接失败');
  ws.onclose = (evt) => handlers.onClose?.(evt.code, evt.reason || '');

  return {
    send: (payload) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        return true;
      }
      return false;
    },
    close: () => ws.close(),
    readyState: () => ws.readyState,
  };
}

export function sendAgentStart(birth: {
  gender: string;
  birthDateTime: string;
  timezone?: string;
  birthPlace?: string | null;
  accuracy?: Record<string, unknown>;
}) {
  return {
    type: 'start' as const,
    gender: birth.gender,
    birthDateTime: birth.birthDateTime,
    timezone: birth.timezone ?? 'Asia/Shanghai',
    birthPlace: birth.birthPlace ?? null,
    accuracy: birth.accuracy ?? { time: 'exact', place: 'missing' },
  };
}

export function sendAgentMessage(text: string, extra?: Record<string, unknown>) {
  return { type: 'message' as const, text, ...extra };
}

export function isAgentTextDelta(
  event: AgentWsEvent,
): event is AgentWsEvent & { type: 'delta'; text: string } {
  return event.type === 'delta' && typeof event.text === 'string';
}

export function isAgentDone(
  event: AgentWsEvent,
): event is AgentWsEvent & { type: 'done'; fullText?: string } {
  return event.type === 'done';
}

export function isAgentConnected(event: AgentWsEvent): boolean {
  return event.type === 'connected';
}
