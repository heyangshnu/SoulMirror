import { Platform } from 'react-native';
import { API_BASE } from './api';
import { useAuthStore } from '@/store/auth';

function consumeSseChunk(raw: string, onDelta: (text: string) => void): string {
  const lines = raw.split('\n');
  const remainder = lines.pop() ?? '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') continue;
    try {
      const chunk = JSON.parse(payload) as { delta?: string };
      if (chunk.delta) onDelta(chunk.delta);
    } catch {
      /* skip malformed */
    }
  }
  return remainder;
}

/** XMLHttpRequest 流式 SSE（Android / iOS 均可用） */
function streamBotChatXhr(
  sessionId: string,
  message: string,
  onDelta: (text: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const token = useAuthStore.getState().token;
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE}/bot/sessions/${sessionId}/messages/stream`;

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.timeout = 120000;

    let lineBuffer = '';
    let lastIndex = 0;

    xhr.onprogress = () => {
      const chunk = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      lineBuffer += chunk;
      lineBuffer = consumeSseChunk(lineBuffer, onDelta);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (lineBuffer.trim()) consumeSseChunk(`${lineBuffer}\n`, onDelta);
        resolve();
        return;
      }
      let detail = xhr.responseText.slice(0, 200);
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string | string[] };
        if (Array.isArray(parsed.message)) detail = parsed.message.join('；');
        else if (typeof parsed.message === 'string') detail = parsed.message;
      } catch {
        /* use raw */
      }
      reject(new Error(detail || `请求失败 (${xhr.status})`));
    };

    xhr.onerror = () => reject(new Error('网络连接失败，请检查 WiFi/流量或切换网络后重试'));
    xhr.ontimeout = () => reject(new Error('请求超时，当前网络可能不稳定'));
    xhr.send(JSON.stringify({ message }));
  });
}

async function streamBotChatFetch(
  sessionId: string,
  message: string,
  onDelta: (text: string) => void,
): Promise<void> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE}/bot/sessions/${sessionId}/messages/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const text = await res.text();
    let detail = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) detail = parsed.message.join('；');
      else if (typeof parsed.message === 'string') detail = parsed.message;
    } catch {
      /* use raw */
    }
    throw new Error(detail || `请求失败 (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    await streamBotChatXhr(sessionId, message, onDelta);
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const chunk = JSON.parse(payload) as { delta?: string };
        if (chunk.delta) onDelta(chunk.delta);
      } catch {
        /* skip */
      }
    }
  }
}

/** 流式发送心镜聊天（SSE） */
export async function streamBotChat(
  sessionId: string,
  message: string,
  onDelta: (text: string) => void,
): Promise<void> {
  // React Native 上 XHR 流式更可靠；Web 用 fetch
  if (Platform.OS === 'web') {
    await streamBotChatFetch(sessionId, message, onDelta);
  } else {
    await streamBotChatXhr(sessionId, message, onDelta);
  }
}
