import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/theme/tokens';

export type PlanCardData = {
  id: string;
  title: string;
  body: string;
  actions: string[];
  phrases?: string[];
};

type Props = {
  card: PlanCardData;
  onFollowUp?: (question: string, cardId: string) => void;
  followUpLabel?: string;
};

export function PlanCardView({ card, onFollowUp, followUpLabel }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.body}>{card.body}</Text>
      {card.actions.map((a, i) => (
        <Text key={i} style={styles.action}>
          {i + 1}. {a}
        </Text>
      ))}
      {card.phrases?.map((p, i) => (
        <Text key={`p${i}`} style={styles.phrase}>
          「{p}」
        </Text>
      ))}
      {onFollowUp ? (
        <Pressable onPress={() => onFollowUp('为什么会这样？', card.id)} style={styles.followBtn}>
          <Text style={styles.followText}>{followUpLabel ?? '继续问'}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, alignSelf: 'stretch' },
  title: { ...typography.title, fontSize: 17, marginBottom: 8 },
  body: { ...typography.body, color: colors.text, lineHeight: 24, marginBottom: 12 },
  action: { ...typography.body, color: colors.textSecondary, marginBottom: 6, paddingLeft: 4 },
  phrase: { ...typography.caption, color: colors.primary, fontStyle: 'italic', marginTop: 4 },
  followBtn: { marginTop: 12 },
  followText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
});
