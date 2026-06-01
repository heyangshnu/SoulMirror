import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { TestCard } from '@/components/ui/TestCard';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type CatalogItem = {
  type: string;
  title: string;
  subtitle: string;
  duration: string;
  icon: string;
};

const ROUTES: Record<string, string> = {
  bazi: '/tests/bazi',
  mbti: '/tests/mbti',
  tarot: '/tests/tarot',
  palm: '/tests/palm',
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
            { type: 'bazi', title: '八字命盘', subtitle: '传统命理 × 现代心理', duration: '约 5 分钟', icon: 'moon.stars' },
            { type: 'mbti', title: 'MBTI 人格', subtitle: '28 题精简版', duration: '约 8 分钟', icon: 'brain' },
            { type: 'tarot', title: '塔罗占卜', subtitle: '三牌阵解读', duration: '约 3 分钟', icon: 'sparkles' },
            { type: 'palm', title: '手相分析', subtitle: '掌纹 AI 解读', duration: '约 4 分钟', icon: 'hand.raised' },
          ]),
        )
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <Screen>
      <Text style={styles.brand}>心镜 SoulMirror</Text>
      <Text style={styles.title}>探索自我</Text>
      <Text style={styles.subtitle}>选择一种方式，开启专属洞察之旅</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        items.map((item) => (
          <TestCard
            key={item.type}
            title={item.title}
            subtitle={item.subtitle}
            duration={item.duration}
            icon={item.icon}
            onPress={() => router.push(ROUTES[item.type] as '/tests/bazi')}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { ...typography.small, color: colors.primary, marginTop: spacing.md, fontWeight: '600' },
  title: { ...typography.hero, marginTop: 8 },
  subtitle: { ...typography.caption, marginBottom: spacing.lg },
});
