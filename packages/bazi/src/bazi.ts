export interface BaziPillars {
  year: string;
  month: string;
  day: string;
  hour: string;
}

export interface BaziSummary {
  pillars: BaziPillars;
  dayMaster: string;
  dayElement: '金' | '木' | '水' | '火' | '土';
  elementCounts: Record<string, number>;
  dominantElement: string;
  traits: string[];
}

const STEM_ELEMENT: Record<string, '金' | '木' | '水' | '火' | '土'> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
};

const BRANCH_ELEMENT: Record<string, string> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
};

function stemOf(pillar: string): string {
  return pillar.charAt(0);
}

function branchOf(pillar: string): string {
  return pillar.charAt(1);
}

export function buildBaziSummary(pillars: BaziPillars): BaziSummary {
  const dayStem = stemOf(pillars.day);
  const dayElement = STEM_ELEMENT[dayStem] ?? '木';
  const counts: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };

  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    const s = STEM_ELEMENT[stemOf(p)];
    const b = BRANCH_ELEMENT[branchOf(p)];
    if (s) counts[s] += 1;
    if (b) counts[b] += 0.5;
  }

  const dominantElement = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? dayElement;
  const traits: string[] = [];

  if (counts['火'] >= 2) traits.push('推动力强、表达直接');
  if (counts['土'] >= 2.5) traits.push('现实感强、重视结果');
  if (counts['水'] < 1) traits.push('冷却与复盘不足');
  if (counts['木'] >= 2) traits.push('成长欲与方向感强');
  if (counts['金'] >= 2) traits.push('原则感与边界清晰');

  return {
    pillars,
    dayMaster: dayStem,
    dayElement,
    elementCounts: counts,
    dominantElement,
    traits,
  };
}
