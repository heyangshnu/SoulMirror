import { Redirect, useLocalSearchParams } from 'expo-router';

/** Archive claude 模式下，legacy followup 重定向到菩萨对话 */
export default function FollowUpRedirect() {
  const { reportId } = useLocalSearchParams<{ reportId?: string }>();
  return (
    <Redirect
      href={{
        pathname: '/(tabs)/chat',
        params: reportId ? { prefill: '我想继续聊聊之前的方案' } : undefined,
      }}
    />
  );
}
