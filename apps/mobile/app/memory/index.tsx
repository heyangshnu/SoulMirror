import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { PendingMemoryCard } from '@/components/guanxin/PendingMemoryCard';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type PendingItem = {
  id: string;
  title: string;
  domain: string;
  excerpt: string;
};

export default function MemoryHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<PendingItem[]>('/memory/pending')
      .then(setPending)
      .catch(() => setPending([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const confirm = async (noteId: string, action: 'confirm' | 'reject') => {
    setActing(noteId);
    try {
      await api.post('/memory/confirm', { noteId, action });
      load();
    } finally {
      setActing(null);
    }
  };

  return (
    <Screen>
      <Text style={styles.subtitle}>{t('memory.subtitle')}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : pending.length === 0 ? (
        <Text style={styles.empty}>{t('memory.empty')}</Text>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <PendingMemoryCard
              title={item.title}
              excerpt={item.excerpt}
              domain={item.domain}
              confirmLabel={t('memory.confirm')}
              rejectLabel={t('memory.notSure')}
              disabled={acting === item.id}
              onConfirm={() => confirm(item.id, 'confirm')}
              onReject={() => confirm(item.id, 'reject')}
              onPressDetail={() => router.push(`/memory/item/${encodeURIComponent(item.id)}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.caption, marginBottom: spacing.lg },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
});
