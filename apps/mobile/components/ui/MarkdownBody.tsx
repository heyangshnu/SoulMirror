import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = { content: string };

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }
  | { type: 'quote'; text: string };

function parseBlocks(raw: string): Block[] {
  const text = raw.replace(/^---[\s\S]*?---\s*/m, '').trim();
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];

  const flushPara = () => {
    const joined = para.join(' ').replace(/\s+/g, ' ').trim();
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
      const level = h[1].length === 1 ? 'h1' : h[1].length === 2 ? 'h2' : 'h3';
      blocks.push({ type: level, text: cleanInline(h[2]) });
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
  return blocks;
}

function cleanInline(s: string) {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function MarkdownBody({ content }: Props) {
  const blocks = parseBlocks(content || '');

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
  wrap: { gap: spacing.sm },
  h1: {
    ...typography.title,
    fontSize: 22,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  h2: {
    ...typography.title,
    fontSize: 17,
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: 2,
  },
  h3: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  p: {
    ...typography.body,
    lineHeight: 26,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  liRow: { flexDirection: 'row', gap: 8, paddingRight: spacing.sm },
  bullet: { ...typography.body, color: colors.primary, lineHeight: 26, width: 14 },
  li: { ...typography.body, flex: 1, lineHeight: 26, color: colors.textSecondary },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryMuted,
    paddingLeft: spacing.md,
    paddingVertical: 4,
    marginVertical: 4,
  },
  quoteText: {
    ...typography.body,
    lineHeight: 24,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
