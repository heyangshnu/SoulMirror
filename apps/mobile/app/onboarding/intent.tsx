import { Redirect } from 'expo-router';

/** Archive claude 模式下，legacy intent 页重定向到菩萨对话 */
export default function IntentRedirect() {
  return <Redirect href="/(tabs)/chat" />;
}
