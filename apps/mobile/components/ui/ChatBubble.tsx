import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type Props = {
  content: string;
  role: 'user' | 'assistant';
};

export function ChatBubble({ content, role }: Props) {
  const isUser = role === 'user';
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        <Text style={[styles.text, isUser && styles.textUser]}>{content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: spacing.sm },
  rowUser: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
  },
  user: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  assistant: {
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { ...typography.body, fontSize: 15 },
  textUser: { color: '#fff' },
});
