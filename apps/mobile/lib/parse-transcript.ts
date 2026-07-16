import type { ChatMessage } from '@/store/bodhisattva-chat';

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Parse agent-host transcript.md sections into chat messages. */
export function parseTranscriptContent(content: string): ChatMessage[] {
  if (!content.trim()) return [];

  const messages: ChatMessage[] = [];
  const blocks = content.split(/\n## /).filter(Boolean);

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i].startsWith('## ') ? blocks[i] : `## ${blocks[i]}`;
    const headerEnd = block.indexOf('\n\n');
    if (headerEnd < 0) continue;

    const header = block.slice(0, headerEnd);
    const text = block.slice(headerEnd + 2).trim();
    if (!text) continue;

    if (/^## 用户/u.test(header)) {
      messages.push({ id: uid('user'), role: 'user', text });
    } else if (/^## 菩萨/u.test(header)) {
      messages.push({ id: uid('assistant'), role: 'assistant', text });
    }
  }

  return messages;
}
