import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';

export default function MemorialScreen() {
  return (
    <Screen>
      <Text style={styles.title}>纪念日</Text>
      <Text style={styles.subtitle}>记录重要时刻，获取互动建议</Text>
      <Card>
        <View style={styles.coming}>
          <Text style={styles.comingTitle}>即将上线</Text>
          <Text style={styles.comingDesc}>
            日历提醒、纪念日互动建议与活动卡片将在下一版本推出，敬请期待。
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md },
  subtitle: { ...typography.caption, marginBottom: spacing.lg },
  coming: { alignItems: 'center', paddingVertical: 24 },
  comingTitle: { ...typography.title, color: colors.primary },
  comingDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 12 },
});
