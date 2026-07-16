import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  onSubmit: () => void;
};

export function ChatInputBar({ value, onChangeText, placeholder, onSubmit }: Props) {
  return (
    <View style={styles.bar}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={onSubmit}
        returnKeyType="send"
      />
      <Pressable style={[styles.fab, !value.trim() && styles.fabDisabled]} onPress={onSubmit}>
        <Text style={styles.fabText}>→</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: { flex: 1, ...typography.body, minHeight: 40 },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabDisabled: { opacity: 0.4 },
  fabText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
});
