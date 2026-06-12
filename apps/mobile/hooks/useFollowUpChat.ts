import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { streamBotChat } from '@/lib/chat-stream';
import { useTranslation } from '@/hooks/useTranslation';

type Message = { role: string; content: string };

function buildHistory(msgs: Message[]): { role: string; content: string }[] {
  return msgs
    .slice(0, -2)
    .filter((m) => m.content?.trim() && (m.role === 'user' || m.role === 'assistant'))
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content }));
}

export function useFollowUpChat(planContext?: string, planCardId?: string) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [ready, setReady] = useState(false);
  const initialPlanContext = useRef(planContext);
  const planFollowUpUsed = useRef(false);

  const init = useCallback(async () => {
    try {
      const sessions = await api.get<{ _id: string }[]>('/bot/sessions');
      if (sessions.length > 0) {
        const s = await api.get<{ _id: string; messages: Message[] }>(`/bot/sessions/${sessions[0]._id}`);
        setSessionId(s._id);
        const loaded = s.messages.length > 0 ? s.messages : [];
        setMessages(loaded);
        if (loaded.some((m) => m.role === 'user')) {
          planFollowUpUsed.current = true;
        }
      } else {
        const created = await api.post<{ _id: string }>('/bot/sessions');
        setSessionId(created._id);
      }
    } catch {
      setSessionId('local');
    } finally {
      setReady(true);
    }
  }, []);

  const persistExchange = async (userText: string, assistantText: string) => {
    if (!sessionId || sessionId === 'local') return;
    try {
      await api.post(`/bot/sessions/${sessionId}/messages/append`, {
        messages: [
          { role: 'user', content: userText },
          { role: 'assistant', content: assistantText },
        ],
      });
    } catch {
      /* ignore */
    }
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const pending = [...messages, { role: 'user', content: trimmed }, { role: 'assistant', content: '' }];
    setMessages(pending);
    setStreaming(true);

    try {
      const ctx = initialPlanContext.current;
      const usePlanFollowUp = !!ctx && !planFollowUpUsed.current;

      if (usePlanFollowUp) {
        const res = await api.post<{ reply: string }>('/followup/ask', {
          message: trimmed,
          planCardId: planCardId || undefined,
          planContext: ctx,
          history: buildHistory(pending),
          layer: 1,
        });
        planFollowUpUsed.current = true;
        setMessages((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: res.reply };
          return next;
        });
        await persistExchange(trimmed, res.reply);
        return;
      }

      let sid = sessionId;
      if (!sid || sid === 'local') {
        const sessions = await api.get<{ _id: string }[]>('/bot/sessions');
        if (sessions.length > 0) sid = sessions[0]._id;
        else sid = (await api.post<{ _id: string }>('/bot/sessions'))._id;
        setSessionId(sid);
      }
      await streamBotChat(sid, trimmed, (delta) => {
        setMessages((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + delta };
          return next;
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('mirror.streamInterrupted');
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === 'assistant' && !last.content) next[next.length - 1] = { ...last, content: msg };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return { messages, streaming, ready, init, send };
}
