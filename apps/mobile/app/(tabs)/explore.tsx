import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { TestCard } from '@/components/ui/TestCard';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type CatalogItem = {
  type: string;
  title: string;
  subtitle: string;
  duration: string;
  icon: string;
};

function localizeItem(item: CatalogItem, t: (k: string) => string): CatalogItem {
  if (item.type === 'ziwei') {
    return {
      ...item,
      title: t('explore.ziweiTitle'),
      subtitle: t('explore.ziweiSubtitle'),
      duration: t('explore.ziweiDuration'),
    };
  }
  return item;
}

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      api
        .get<{ items: CatalogItem[] }>('/tests/catalog', false)
        .then((res) => setItems(res.items.map((i) => localizeItem(i, t))))
        .catch(() =>
          setItems([
            localizeItem(
              { type: 'ziwei', title: '', subtitle: '', duration: '', icon: 'star.circle' },
              t,
            ),
          ]),
        )
        .finally(() => setLoading(false));
    }, [t]),
  );

  return (
    <Screen>
      <Text style={styles.brand}>{t('common.brand')}</Text>
      <Text style={styles.title}>{t('explore.title')}</Text>
      <Text style={styles.subtitle}>{t('explore.subtitle')}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {items.map((item) => (
            <TestCard
              key={item.type}
              title={item.title}
              subtitle={item.subtitle}
              duration={item.duration}
              icon={item.icon}
              onPress={() => router.push('/chart/setup' as Href)}
            />
          ))}

          <View style={styles.quickRow}>
            <Button
              title={t('explore.myReading')}
              variant="secondary"
              onPress={() => router.push('/chart/result' as Href)}
              style={styles.quickBtn}
            />
            <Button
              title={t('explore.relations')}
              variant="secondary"
              onPress={() => router.push('/chart/relations' as Href)}
              style={styles.quickBtn}
            />
          </View>
          <Button
            title={t('explore.voiceDiary')}
            variant="secondary"
            onPress={() => router.push('/chart/voice-diary' as Href)}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { ...typography.small, color: colors.primary, marginTop: spacing.md, fontWeight: '600' },
  title: { ...typography.hero, marginTop: 8 },
  subtitle: { ...typography.caption, marginBottom: spacing.lg },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 8 },
  quickBtn: { flex: 1 },
});
