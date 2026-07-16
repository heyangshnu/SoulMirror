import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type Relation = {
  _id: string;
  name: string;
  relation?: string;
  birthDate?: string;
};

export default function RelationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api
        .get<Relation[]>('/chart/relations')
        .then(setRelations)
        .catch(() => setRelations([]))
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <Screen>
      <Text style={styles.subtitle}>{t('relations.subtitle')}</Text>

      <Button
        title={t('relations.manage')}
        variant="secondary"
        onPress={() => router.push('/chart/relations')}
        style={{ marginBottom: spacing.lg }}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : relations.length === 0 ? (
        <Text style={styles.empty}>{t('relations.empty')}</Text>
      ) : (
        <FlatList
          data={relations}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/relation/${item._id}`)}>
              <Card style={styles.card}>
                <Text style={styles.name}>{item.name}</Text>
                {item.relation ? <Text style={styles.meta}>{item.relation}</Text> : null}
                {item.birthDate ? <Text style={styles.meta}>{item.birthDate}</Text> : null}
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.caption, marginBottom: spacing.lg },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { marginBottom: spacing.md },
  name: { ...typography.title, fontSize: 17 },
  meta: { ...typography.caption, marginTop: 4 },
});
