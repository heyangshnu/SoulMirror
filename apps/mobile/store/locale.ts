import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Locale } from '@/lib/i18n/types';

interface LocaleState {
  locale: Locale;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  setHydrated: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: resolveDeviceLocale(),
      hydrated: false,
      setLocale: (locale) => set({ locale }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'soulmirror-locale',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export function resolveDeviceLocale(): Locale {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as {
      getLocales: () => { languageCode?: string }[];
    };
    const code = getLocales()[0]?.languageCode?.toLowerCase() ?? 'zh';
    return code.startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'zh';
  }
}
