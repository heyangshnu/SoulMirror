import { en } from './locales/en';
import { zh } from './locales/zh';
import type { Locale, TranslationTree } from './types';

const catalogs: Record<Locale, TranslationTree> = { zh, en };

function getPath(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split('.');
  let cur: string | TranslationTree | undefined = tree;
  for (const part of parts) {
    if (cur == null || typeof cur === 'string') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  let text = getPath(catalogs[locale], key) ?? getPath(catalogs.zh, key) ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return text;
}

export { zh, en };
export type { Locale };
