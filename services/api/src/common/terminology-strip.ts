const FORBIDDEN_TERMS = [
  '宫位', '四化', '大限', '流年', '命宫', '身宫', '夫妻宫', '子女宫', '福德宫',
  '事业宫', '迁移宫', '田宅宫', '武曲', '七杀', '紫微', '天机', '天梁', '天同',
  '太阴', '巨门', '廉贞', '贪狼', '化禄', '化权', '化科', '化忌',
  '八字', '斗数', '星曜', '日主', '十神', '五行', '乾造', '坤造',
  '[BZ]', '[ZW-M]', '[ZW-D]', '[ZW-Y]', '[REAL]', '[SYN]',
];

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/迁移大限/g, '外部扩张阶段'],
  [/子女大限/g, '家庭育儿阶段'],
  [/命盘/g, '底层结构'],
  [/流年/g, '今年'],
  [/大限/g, '这几年'],
];

/** Collapse spaces/tabs within a line; keep paragraph newlines. */
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function terminologyStrip(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [pat, repl] of REPLACEMENTS) {
    out = out.replace(pat, repl);
  }
  for (const term of FORBIDDEN_TERMS) {
    if (term.length <= 1) continue;
    out = out.split(term).join('');
  }
  return normalizeWhitespace(out);
}

export function terminologyStripDeep<T>(value: T): T {
  if (typeof value === 'string') return terminologyStrip(value) as T;
  if (Array.isArray(value)) return value.map((v) => terminologyStripDeep(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = terminologyStripDeep(v);
    }
    return out as T;
  }
  return value;
}
