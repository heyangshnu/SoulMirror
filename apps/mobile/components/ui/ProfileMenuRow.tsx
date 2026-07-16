import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = {
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
};

export function ProfileMenuRow({ label, subtitle, onPress, showChevron = true }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showChevron && onPress ? (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          tintColor={colors.textMuted}
        />
      ) : null}
    </Pressable>
  );
}

export function ProfileMenuDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  pressed: { backgroundColor: colors.backgroundSecondary },
  textWrap: { flex: 1, paddingRight: spacing.sm },
  label: { ...typography.body, fontWeight: '500', color: colors.text },
  subtitle: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
});
