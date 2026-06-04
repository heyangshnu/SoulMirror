export type Locale = 'zh' | 'en';

export type TranslationTree = {
  [key: string]: string | TranslationTree;
};
