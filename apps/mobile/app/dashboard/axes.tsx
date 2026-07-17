import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { AxisChip } from '@/components/guanxin/AxisChip';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Dashboard = Record<string, { summary?: string; label?: string; fileCount?: number }>;

const AXES = [
  { key: 'ming', labelKey: 'today.axis.ming', route: 'ming', accent: 'primary' as const },
  { key: 'yuan', labelKey: 'today.axis.yuan', route: 'yuan', accent: 'sage' as const },
  { key: 'jing', labelKey: 'today.axis.jing', route: 'jing', accent: 'amber' as const },
  { key: 'yuanRel', labelKey: 'today.axis.yuanRel', route: 'yuan_rel', accent: 'primary' as const },
  { key: 'li', labelKey: 'today.axis.li', route: 'li', accent: 'sage' as const },
];

export default function AxesDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [dash, setDash] = useState<Dashboard | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.get<Dashboard>('/memory/dashboard').then(setDash).catch(() => setDash(null));
    }, []),
  );

  if (!dash) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{t('dashboard.axesTitle')}</Text>
      <Text style={styles.subtitle}>{t('dashboard.axesSubtitle')}</Text>

      <Card style={styles.listCard}>
        {AXES.map(({ key, labelKey, route, accent }, index) => {
          const entry = dash[key];
          return (
            <View key={key}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <AxisChip
                label={entry?.label ?? t(labelKey)}
                summary={entry?.summary}
                emptyHint={t('dashboard.noSummary')}
                accent={accent}
                onPress={() => router.push(`/dashboard/axis/${route}`)}
              />
              {typeof entry?.fileCount === 'number' ? (
                <Text style={styles.count}>
                  {t('dashboard.notesCount', { count: entry.fileCount })}
                </Text>
              ) : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.caption,
    fontWeight: '400',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  listCard: { paddingVertical: spacing.xs, paddingHorizontal: 0 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 64,
  },
  count: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: -8,
    marginBottom: spacing.sm,
    marginLeft: 64,
  },
});
