import { useCallback } from 'react';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { getAgentMode, isClaudeAgentMode } from '@/lib/agent-mode';

/** Redirect legacy v4 tabs to Archive main chain when claude mode is active. */
export function useLegacyTabRedirect(fallback?: Href) {
  const router = useRouter();
  useFocusEffect(
    useCallback(() => {
      getAgentMode().then((mode) => {
        if (isClaudeAgentMode(mode)) {
          router.replace(fallback ?? '/(tabs)/chat');
        }
      });
    }, [router, fallback]),
  );
}
