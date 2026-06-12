import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ReportGeneratingOverlay } from '@/components/ui/ReportGeneratingOverlay';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Relation = { relationType: string };

export default function FamilyTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [hasFamily, setHasFamily] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api
        .get<Relation[]>('/chart/relations')
        .then((items) =>
          setHasFamily(items.some((r) => r.relationType === 'spouse' || r.relationType === 'child')),
        )
        .catch(() => setHasFamily(false));
    }, []),
  );

  const generateFamilySystem = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const report = await api.post<{ _id: string }>('/analysis/family-system', {});
      router.push(`/report/${report._id}`);
    } catch (e) {
      Alert.alert(t('chart.genFail'), e instanceof Error ? e.message : t('common.retryLater'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <ReportGeneratingOverlay visible={generating} />
      <Screen>
        <Text style={styles.title}>{t('tabs.family')}</Text>
        <Text style={styles.sub}>{t('family.sub')}</Text>
        <Card>
          <Text style={styles.body}>{t('family.hint')}</Text>
          <Button title={t('family.manage')} onPress={() => router.push('/chart/relations')} style={{ marginTop: 12 }} />
        </Card>

        {hasFamily === false ? (
          <Card style={styles.warnCard}>
            <Text style={styles.body}>{t('family.needProfiles')}</Text>
          </Card>
        ) : hasFamily ? (
          <Button
            title={t('family.generateSystem')}
            onPress={generateFamilySystem}
            disabled={generating}
            style={{ marginTop: spacing.lg }}
          />
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md },
  sub: { ...typography.caption, marginBottom: spacing.lg },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  warnCard: { marginTop: spacing.lg, backgroundColor: colors.primaryMuted },
});
