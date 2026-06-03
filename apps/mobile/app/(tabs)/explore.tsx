import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { TestCard } from '@/components/ui/TestCard';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type CatalogItem = {
  type: string;
  title: string;
  subtitle: string;
  duration: string;
  icon: string;
};

export default function ExploreScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      api
        .get<{ items: CatalogItem[] }>('/tests/catalog', false)
        .then((res) => setItems(res.items))
        .catch(() =>
          setItems([
            { type: 'ziwei', title: '紫微斗数', subtitle: '三合派排盘 · 个性化觉察', duration: '约 3 分钟', icon: 'star.circle' },
          ]),
        )
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <Screen>
      <Text style={styles.brand}>心镜 SoulMirror</Text>
      <Text style={styles.title}>探索自我</Text>
      <Text style={styles.subtitle}>紫微斗数 · 结合你的近况，生成专属觉察</Text>

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
            <Button title="我的解读" variant="secondary" onPress={() => router.push('/chart/result' as Href)} style={styles.quickBtn} />
            <Button title="关系人" variant="secondary" onPress={() => router.push('/chart/relations' as Href)} style={styles.quickBtn} />
          </View>
          <Button title="语音日记" variant="secondary" onPress={() => router.push('/chart/voice-diary' as Href)} />
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
