import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDisplaySummary } from '@/lib/format-display-text';
import { colors, radius, spacing, typography } from '@/theme/tokens';

type Props = {
  label: string;
  summary?: string;
  emptyHint?: string;
  onPress?: () => void;
  accent?: 'primary' | 'sage' | 'amber';
};

const ACCENT = {
  primary: { badge: colors.primaryMuted, ink: colors.primary },
  sage: { badge: colors.sageMuted, ink: colors.sage },
  amber: { badge: '#F5EDD6', ink: colors.amber },
} as const;

export function AxisChip({
  label,
  summary,
  emptyHint = '还在积累中…',
  onPress,
  accent = 'primary',
}: Props) {
  const cleaned = formatDisplaySummary(summary, 96);
  const tone = ACCENT[accent];

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.pressed : null]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.badge, { backgroundColor: tone.badge }]}>
        <Text style={[styles.badgeText, { color: tone.ink }]}>{label.slice(0, 1)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.summary, !cleaned && styles.summaryEmpty]} numberOfLines={2}>
          {cleaned || emptyHint}
        </Text>
      </View>
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm + 4,
  },
  pressed: { backgroundColor: colors.backgroundSecondary },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: { flex: 1, minWidth: 0 },
  label: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  summary: {
    ...typography.caption,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 21,
  },
  summaryEmpty: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    paddingLeft: 4,
    marginTop: -2,
  },
});
