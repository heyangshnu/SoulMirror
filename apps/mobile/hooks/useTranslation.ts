import { useCallback } from 'react';
import { translate, type Locale } from '@/lib/i18n';
import { useLocaleStore } from '@/store/locale';

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );
  return { t, locale, setLocale };
}

export function toneLabel(t: (k: string) => string, tone?: string) {
  const key = `tones.${tone ?? 'gentle'}`;
  const label = t(key);
  return label === key ? tone ?? 'gentle' : label;
}

export function reportTypeLabel(t: (k: string) => string, testType: string) {
  const key = `reports.types.${testType}`;
  const label = t(key);
  return label === key ? testType : label;
}

export type { Locale };
