import type { BaziSummary } from './bazi';

export interface BaziTag {
  id: string;
  source: 'BZ';
  label: string;
  productHint: string;
}

export function extractBaziTags(summary: BaziSummary): BaziTag[] {
  const tags: BaziTag[] = [
    {
      id: 'bz_day_master',
      source: 'BZ',
      label: `${summary.dayMaster}${summary.dayElement}`,
      productHint: `日主${summary.dayElement}，底层气质与节奏`,
    },
  ];

  for (const trait of summary.traits) {
    tags.push({
      id: `bz_trait_${tags.length}`,
      source: 'BZ',
      label: trait,
      productHint: trait,
    });
  }

  if (summary.elementCounts['水'] < 1) {
    tags.push({
      id: 'bz_water_weak',
      source: 'BZ',
      label: '水弱',
      productHint: '需要冷却、休息与延迟决策，而非玄学补物',
    });
  }

  if (summary.elementCounts['火'] >= 2) {
    tags.push({
      id: 'bz_fire_strong',
      source: 'BZ',
      label: '火透',
      productHint: '想法容易推进成行动，越累越想控制',
    });
  }

  return tags;
}
