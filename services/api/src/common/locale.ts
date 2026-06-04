export type AppLocale = 'zh' | 'en';

export function parseLocale(acceptLanguage?: string | string[]): AppLocale {
  const raw = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
  if (!raw) return 'zh';
  const first = raw.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('en') ? 'en' : 'zh';
}
