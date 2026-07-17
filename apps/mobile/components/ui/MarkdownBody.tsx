import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = { content: string };

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }
  | { type: 'quote'; text: string };

const SKIP_HEADINGS =
  /^(Summary|Observations|Insights|Next Steps|History|摘要|概述)$/i;

function cleanInline(s: string) {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[_~]/g, '')
    .trim();
}

function normalizeSource(raw: string): string {
  let text = raw.replace(/\r\n?/g, '\n').replace(/^---[\s\S]*?---\s*/m, '').trim();
  // Ensure markdown headings start on their own line
  text = text.replace(/([^\n])\s*(#{1,3})\s+/g, '$1\n\n$2 ');
  return text;
}

function parseBlocks(raw: string): Block[] {
  const text = normalizeSource(raw);
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];

  const flushPara = () => {
    const joined = cleanInline(para.join(' ').replace(/\s+/g, ' ').trim());
    if (joined) blocks.push({ type: 'p', text: joined });
    para = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushPara();
      continue;
    }
    if (/^---+$/.test(trimmed)) {
      flushPara();
      continue;
    }
    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      flushPara();
      const heading = cleanInline(h[2]);
      if (!heading || SKIP_HEADINGS.test(heading)) continue;
      const level = h[1].length === 1 ? 'h1' : h[1].length === 2 ? 'h2' : 'h3';
      blocks.push({ type: level, text: heading });
      continue;
    }
    if (/^[-*•]\s+/.test(trimmed)) {
      flushPara();
      blocks.push({ type: 'li', text: cleanInline(trimmed.replace(/^[-*•]\s+/, '')) });
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      flushPara();
      blocks.push({ type: 'quote', text: cleanInline(trimmed.replace(/^>\s?/, '')) });
      continue;
    }
    para.push(trimmed);
  }
  flushPara();

  // Fallback: break a single huge paragraph into readable chunks
  if (blocks.length === 1 && blocks[0].type === 'p' && blocks[0].text.length > 140) {
    const sentences = blocks[0].text.split(/(?<=[。！？；])\s*/).filter(Boolean);
    const out: Block[] = [];
    let buf = '';
    for (const s of sentences) {
      if ((buf + s).length > 96 && buf) {
        out.push({ type: 'p', text: buf.trim() });
        buf = s;
      } else {
        buf += s;
      }
    }
    if (buf.trim()) out.push({ type: 'p', text: buf.trim() });
    return out.length ? out : blocks;
  }

  return blocks;
}

export function MarkdownBody({ content }: Props) {
  const blocks = parseBlocks(content || '');

  if (!blocks.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {blocks.map((block, i) => {
        if (block.type === 'h1') {
          return (
            <Text key={i} style={styles.h1}>
              {block.text}
            </Text>
          );
        }
        if (block.type === 'h2') {
          return (
            <Text key={i} style={styles.h2}>
              {block.text}
            </Text>
          );
        }
        if (block.type === 'h3') {
          return (
            <Text key={i} style={styles.h3}>
              {block.text}
            </Text>
          );
        }
        if (block.type === 'li') {
          return (
            <View key={i} style={styles.liRow}>
              <Text style={styles.bullet}>·</Text>
              <Text style={styles.li}>{block.text}</Text>
            </View>
          );
        }
        if (block.type === 'quote') {
          return (
            <View key={i} style={styles.quote}>
              <Text style={styles.quoteText}>{block.text}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.p}>
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  h1: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
  h2: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    lineHeight: 26,
    marginTop: spacing.xs,
  },
  h3: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  p: {
    ...typography.body,
    fontWeight: '400',
    fontSize: 15,
    lineHeight: 28,
    color: colors.textSecondary,
  },
  liRow: { flexDirection: 'row', gap: 8, paddingRight: spacing.sm },
  bullet: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.primary,
    lineHeight: 28,
    width: 14,
  },
  li: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 28,
    color: colors.textSecondary,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryMuted,
    paddingLeft: spacing.md,
    paddingVertical: 4,
  },
  quoteText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 26,
    color: colors.textMuted,
  },
});
