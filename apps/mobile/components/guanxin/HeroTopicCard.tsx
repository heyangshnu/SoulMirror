import { Pressable, StyleSheet, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDisplaySummary } from '@/lib/format-display-text';
import { colors, spacing, typography } from '@/theme/tokens';

type Props = {
  title: string;
  summary: string;
  domain?: string;
  onContinue?: () => void;
  continueLabel?: string;
};

export function HeroTopicCard({ title, summary, domain, onContinue, continueLabel }: Props) {
  const { t } = useTranslation();
  const domainLabel =
    domain === 'yuan'
      ? t('today.axis.yuan')
      : domain === 'jing'
        ? t('today.axis.jing')
        : domain;
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>
        {domainLabel ? `${t('today.currentTopic')} · ${domainLabel}` : t('today.currentTopic')}
      </Text>
      <Text style={styles.title}>{formatDisplaySummary(title, 40) || title}</Text>
      <Text style={styles.summary} numberOfLines={3}>
        {formatDisplaySummary(summary, 120) || summary}
      </Text>
      {onContinue ? (
        <Pressable onPress={onContinue} style={styles.cta}>
          <Text style={styles.ctaText}>{continueLabel ?? t('today.continueTopic')}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, backgroundColor: colors.primaryMuted, borderColor: '#E8D2C6' },
  label: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  title: { ...typography.title, fontSize: 20, marginBottom: 8, color: colors.text },
  summary: { ...typography.body, lineHeight: 24, color: colors.textSecondary },
  cta: { marginTop: spacing.md },
  ctaText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
});
