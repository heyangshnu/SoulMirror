import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/theme/tokens';

const SLIDES = [
  {
    title: '四种探索，看见自己',
    desc: '八字、MBTI、塔罗、手相，融合传统智慧与现代心理学，生成专属洞察报告。',
  },
  {
    title: '专属 AI 陪伴',
    desc: '根据你的测试结果与画像，打造懂你语气的心灵对话伙伴。',
  },
  {
    title: '隐私与安全',
    desc: '支持匿名模式与一键删除。若你感到痛苦，我们会引导你寻求专业帮助。',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];

  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>
      <View style={styles.footer}>
        {step < SLIDES.length - 1 ? (
          <Button title="下一步" onPress={() => setStep(step + 1)} />
        ) : (
          <Button title="开始探索" onPress={() => router.replace('/profile/setup')} />
        )}
        <Button title="跳过" variant="ghost" onPress={() => router.replace('/(tabs)/explore')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },
  title: { ...typography.hero, marginBottom: 16 },
  desc: { ...typography.body, color: colors.textSecondary },
  footer: { padding: spacing.lg, gap: 8 },
});
