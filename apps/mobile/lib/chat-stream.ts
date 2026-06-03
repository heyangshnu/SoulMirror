import { API_BASE } from './api';
import { useAuthStore } from '@/store/auth';

export async function streamBotChat(
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
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.slice(0, 200) || `请求失败 (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

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
