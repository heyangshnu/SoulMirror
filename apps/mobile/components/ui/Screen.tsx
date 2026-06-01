import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scroll = true, padded = true, style }: Props) {
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[padded && styles.padded, style]}>{children}</View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingBottom: insets.bottom }]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  padded: { paddingHorizontal: spacing.lg },
});
