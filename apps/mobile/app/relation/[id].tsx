import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Relation = {
  _id: string;
  name: string;
  relation?: string;
  relationType?: string;
  birthDate?: string;
  birthTime?: string;
  gender?: string;
};

export default function RelationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [relation, setRelation] = useState<Relation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<Relation>(`/chart/relations/${encodeURIComponent(id)}`)
      .then(setRelation)
      .catch(() => setRelation(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!relation) {
    return (
      <Screen>
        <Text style={styles.empty}>{t('relations.empty')}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>{relation.name}</Text>
      <Card style={styles.card}>
        {relation.relation ? (
          <Text style={styles.row}>
            <Text style={styles.label}>{t('relations.title')}: </Text>
            {relation.relation}
          </Text>
        ) : null}
        {relation.birthDate ? (
          <Text style={styles.row}>
            <Text style={styles.label}>{t('chart.birthDate')}: </Text>
            {relation.birthDate}
            {relation.birthTime ? ` ${relation.birthTime}` : ''}
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.hero, marginTop: spacing.md, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  row: { ...typography.body, lineHeight: 26, marginBottom: 8 },
  label: { fontWeight: '700', color: colors.primary },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
