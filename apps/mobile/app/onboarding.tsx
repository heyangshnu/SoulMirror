import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, spacing, typography } from '@/theme/tokens';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const slides = useMemo(
    () => [
      { title: t('onboarding.s1Title'), desc: t('onboarding.s1Body') },
      { title: t('onboarding.s2Title'), desc: t('onboarding.s2Body') },
      { title: t('onboarding.s3Title'), desc: t('onboarding.s3Body') },
    ],
    [t],
  );

  const slide = slides[step];

  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>
      <View style={styles.footer}>
        {step < slides.length - 1 ? (
          <Button title={t('common.next')} onPress={() => setStep(step + 1)} />
        ) : (
          <Button title={t('onboarding.start')} onPress={() => router.replace('/profile/setup')} />
        )}
        <Button title={t('common.skip')} variant="ghost" onPress={() => router.replace('/(tabs)/explore')} />
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
