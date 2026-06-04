export type AppLocale = 'zh' | 'en';

export function parseLocale(acceptLanguage?: string | string[]): AppLocale {
  const raw = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
  if (!raw) return 'zh';
  const first = raw.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.startsWith('en') ? 'en' : 'zh';
}

/** 优先读 App 显式头（避免代理剥掉 Accept-Language） */
export function parseRequestLocale(headers: {
  'x-app-locale'?: string | string[];
  'accept-language'?: string | string[];
}): AppLocale {
  const explicit = headers['x-app-locale'];
  const raw = Array.isArray(explicit) ? explicit[0] : explicit;
  if (raw) {
    const v = raw.trim().toLowerCase();
    if (v.startsWith('en')) return 'en';
    if (v.startsWith('zh')) return 'zh';
  }
  return parseLocale(headers['accept-language']);
}
