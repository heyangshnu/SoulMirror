import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Card } from './Card';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = {
  title: string;
  subtitle: string;
  duration: string;
  icon: string;
  onPress: () => void;
};

export function TestCard({ title, subtitle, duration, icon, onPress }: Props) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <SymbolView name={{ ios: icon, android: 'star', web: 'star' }} size={28} tintColor={colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={18}
          tintColor={colors.textMuted}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: { flex: 1 },
  title: { ...typography.title, fontSize: 17 },
  subtitle: { ...typography.caption, marginTop: 4 },
  duration: { ...typography.small, marginTop: 6 },
});
