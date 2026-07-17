import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  /** 有顶部导航栏时传 true */
  hasHeader?: boolean;
};

/** 底部输入栏 + 聊天列表的键盘适配 */
export function KeyboardChatLayout({ children, style, hasHeader = false }: Props) {
  const insets = useSafeAreaInsets();
  const offset = hasHeader ? insets.top + 56 : insets.top + 8;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? offset : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
});
