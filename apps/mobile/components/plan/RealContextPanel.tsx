import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/lib/api';
import { colors, spacing, typography } from '@/theme/tokens';

export function RealContextPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState<string>('married');
  const [currentConflict, setCurrentConflict] = useState('');
  const [freeText, setFreeText] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/chart/real-context', {
        relationshipStatus,
        currentConflict: currentConflict.trim() || undefined,
        freeText: freeText.trim() || undefined,
      });
      Alert.alert(t('common.ok'), t('realContext.saved'));
    } catch (e) {
      Alert.alert(t('common.fail'), e instanceof Error ? e.message : t('common.retryLater'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Pressable onPress={() => setOpen(!open)} style={styles.header}>
        <Text style={styles.title}>{t('realContext.panelTitle')}</Text>
        <Text style={styles.toggle}>{open ? '−' : '+'}</Text>
      </Pressable>
      {!open ? (
        <Text style={styles.hint}>{t('realContext.panelHint')}</Text>
      ) : (
        <View>
          <Text style={styles.label}>{t('realContext.relationship')}</Text>
          <View style={styles.row}>
            {(['single', 'dating', 'married', 'separated'] as const).map((s) => (
              <Button
                key={s}
                title={t(`realContext.status_${s}`)}
                variant={relationshipStatus === s ? 'primary' : 'secondary'}
                onPress={() => setRelationshipStatus(s)}
                style={styles.chip}
              />
            ))}
          </View>
          <Text style={styles.label}>{t('realContext.conflict')}</Text>
          <TextInput
            style={styles.input}
            value={currentConflict}
            onChangeText={setCurrentConflict}
            placeholder={t('realContext.conflictPh')}
            multiline
          />
          <Text style={styles.label}>{t('realContext.free')}</Text>
          <TextInput style={styles.input} value={freeText} onChangeText={setFreeText} multiline />
          <Button title={t('realContext.save')} onPress={save} loading={saving} style={{ marginTop: 8 }} />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.title, fontSize: 15, color: colors.primary },
  toggle: { ...typography.title, color: colors.primary },
  hint: { ...typography.caption, marginTop: 8, lineHeight: 20 },
  label: { ...typography.caption, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexGrow: 1, minWidth: '22%' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
    marginBottom: 4,
    backgroundColor: colors.background,
    textAlignVertical: 'top',
  },
});
