import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboardAvoid?: boolean;
  style?: ViewStyle;
};

export function Screen({
  children,
  scroll = true,
  padded = true,
  keyboardAvoid = false,
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const inner = <View style={[padded && styles.padded, style]}>{children}</View>;

  const scrollContent = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets={keyboardAvoid}
      contentContainerStyle={[
        styles.scroll,
        { paddingBottom: insets.bottom + (keyboardAvoid ? 200 : 100) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {inner}
    </ScrollView>
  ) : (
    inner
  );

  const container = (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {scrollContent}
    </View>
  );

  if (!keyboardAvoid) {
    return <View style={styles.root}>{container}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      {container}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  padded: { paddingHorizontal: spacing.lg },
});
