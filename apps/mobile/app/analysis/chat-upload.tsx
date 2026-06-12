import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

type ChatAnalysis = {
  summary: string;
  patterns?: string[];
  recommendations?: string[];
};

export default function ChatUploadScreen() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChatAnalysis | null>(null);

  const analyze = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      Alert.alert(t('common.ok'), t('chatUpload.tooShort'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<ChatAnalysis>('/chart/chat-upload', { text: trimmed });
      setResult(res);
    } catch (e) {
      Alert.alert(t('common.fail'), e instanceof Error ? e.message : t('common.retryLater'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('chatUpload.nav') }} />
      <Screen keyboardAvoid>
        <ScrollView>
          <Text style={styles.sub}>{t('chatUpload.sub')}</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            multiline
            placeholder={t('chatUpload.placeholder')}
            textAlignVertical="top"
          />
          <Button title={t('chatUpload.analyze')} onPress={analyze} loading={loading} disabled={loading} />

          {result ? (
            <Card style={styles.resultCard}>
              <Text style={styles.label}>{t('chatUpload.summary')}</Text>
              <Text style={styles.body}>{result.summary}</Text>
              {(result.patterns?.length ?? 0) > 0 ? (
                <>
                  <Text style={styles.label}>{t('chatUpload.patterns')}</Text>
                  {result.patterns!.map((p) => (
                    <Text key={p} style={styles.bullet}>
                      · {p}
                    </Text>
                  ))}
                </>
              ) : null}
              {(result.recommendations?.length ?? 0) > 0 ? (
                <>
                  <Text style={styles.label}>{t('chatUpload.recommendations')}</Text>
                  {result.recommendations!.map((r) => (
                    <Text key={r} style={styles.bullet}>
                      · {r}
                    </Text>
                  ))}
                </>
              ) : null}
              <Text style={styles.doneHint}>{t('chatUpload.doneHint')}</Text>
            </Card>
          ) : null}

          <View style={styles.privacy}>
            <Text style={styles.privacyText}>{t('chatUpload.privacy')}</Text>
          </View>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  sub: { ...typography.caption, marginBottom: spacing.md, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 180,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    ...typography.body,
  },
  resultCard: { marginTop: spacing.lg },
  label: { ...typography.title, fontSize: 15, color: colors.primary, marginBottom: 6, marginTop: 8 },
  body: { ...typography.body, lineHeight: 24 },
  bullet: { ...typography.body, lineHeight: 22, color: colors.textSecondary },
  privacy: { marginTop: spacing.lg, marginBottom: spacing.xl },
  privacyText: { ...typography.small, color: colors.textSecondary, lineHeight: 20 },
  doneHint: { ...typography.caption, color: colors.primary, marginTop: spacing.md, lineHeight: 20 },
});
