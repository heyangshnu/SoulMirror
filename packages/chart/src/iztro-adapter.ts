import { astro } from 'iztro';
import type { BirthInput, HoroscopeSummary, NatalChartSummary } from './types';
import { applyTrueSolarTime, timeStringToIndex } from './solar-time';

const ALGORITHM_VERSION = 'iztro-sanhe-1.0';

function genderLabel(g: string) {
  return g === 'male' ? '男' : '女';
}

function createAstrolabe(input: BirthInput) {
  const calendar = input.calendar ?? 'solar';
  const timeUnknown = !!input.timeUnknown;
  const gender = genderLabel(input.gender);

  let timeForIndex = input.birthTime;
  if (!timeUnknown) {
    timeForIndex = applyTrueSolarTime(input.birthDate, input.birthTime, {
      birthPlace: input.birthPlace,
      longitude: input.longitude,
    }).adjustedTime;
  }
  const timeIndex = timeStringToIndex(timeForIndex, timeUnknown);

  if (calendar === 'lunar') {
    return astro.byLunar(input.birthDate, timeIndex, gender, !!input.isLeapMonth, true, 'zh-CN');
  }
  return astro.bySolar(`${input.birthDate} ${timeForIndex}`, timeIndex, gender, true, 'zh-CN');
}

function mapPalaces(astrolabe: ReturnType<typeof astro.bySolar>) {
  return astrolabe.palaces.map((p) => ({
    name: p.name,
    earthlyBranch: p.earthlyBranch,
    majorStars: p.majorStars.map((s) => `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[${s.mutagen}]` : ''}`),
    minorStars: [...p.minorStars, ...p.adjectiveStars].slice(0, 8).map((s) => s.name),
    mutagen: p.majorStars.filter((s) => s.mutagen).map((s) => `${s.name}${s.mutagen}`),
    brightness: Object.fromEntries(p.majorStars.map((s) => [s.name, s.brightness || ''])),
  }));
}

export function buildNatalChart(input: BirthInput): NatalChartSummary {
  const timeUnknown = !!input.timeUnknown;
  const astrolabe = createAstrolabe(input);

  let solarMeta = { trueSolarTimeApplied: false, solarTimeOffsetMinutes: 0, longitude: 120 };
  if (!timeUnknown) {
    const solar = applyTrueSolarTime(input.birthDate, input.birthTime, input);
    solarMeta = {
      trueSolarTimeApplied: true,
      solarTimeOffsetMinutes: solar.offsetMinutes,
      longitude: solar.longitude,
    };
  }

  const chineseDate = astrolabe.chineseDate?.split(' ') ?? [];
  return {
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    timeRange: astrolabe.timeRange,
    gender: genderLabel(input.gender),
    soul: astrolabe.soul,
    body: astrolabe.body,
    fiveElementsClass: astrolabe.fiveElementsClass,
    palaces: mapPalaces(astrolabe),
    pillars: {
      year: chineseDate[0] ?? '',
      month: chineseDate[1] ?? '',
      day: chineseDate[2] ?? '',
      hour: chineseDate[3] ?? '',
    },
    timeUnknown,
    trueSolarTimeApplied: solarMeta.trueSolarTimeApplied,
    solarTimeOffsetMinutes: solarMeta.solarTimeOffsetMinutes,
    longitude: solarMeta.longitude,
    algorithmVersion: ALGORITHM_VERSION,
  };
}

function flattenStars(stars?: { name: string }[][]) {
  if (!stars) return [];
  return stars.flat().map((s) => s.name);
}

export function buildHoroscope(input: BirthInput, targetYear?: number): HoroscopeSummary {
  const astrolabe = createAstrolabe(input);
  const year = targetYear ?? new Date().getFullYear();
  const horoscope = astrolabe.horoscope(new Date(`${year}-6-1`));

  const soulPalace = astrolabe.palace('命宫');
  const decadalRange = soulPalace?.decadal?.range?.join('-') ?? horoscope.decadal.name;

  const decadalPalaceName =
    horoscope.decadal.palaceNames?.[horoscope.decadal.index] ?? horoscope.decadal.name;
  const yearlyPalaceName =
    horoscope.yearly.palaceNames?.[horoscope.yearly.index] ?? horoscope.yearly.name;

  return {
    currentAge: horoscope.age?.nominalAge ?? 0,
    decadal: {
      range: decadalRange,
      palace: decadalPalaceName,
      majorStars: flattenStars(horoscope.decadal.stars as { name: string }[][]),
    },
    yearly: {
      year,
      palace: yearlyPalaceName,
      majorStars: flattenStars(horoscope.yearly.stars as { name: string }[][]),
      mutagen: horoscope.yearly.mutagen ?? [],
    },
    monthly: horoscope.monthly
      ? {
          month: new Date().getMonth() + 1,
          palace: horoscope.monthly.palaceNames?.[horoscope.monthly.index] ?? horoscope.monthly.name,
        }
      : undefined,
  };
}

export function buildChartContextText(natal: NatalChartSummary, horoscope?: HoroscopeSummary): string {
  const lines = [
    `【紫微本命·三合】${natal.fiveElementsClass}；命主${natal.soul}；身主${natal.body}`,
    `四柱：${natal.pillars.year} ${natal.pillars.month} ${natal.pillars.day} ${natal.pillars.hour}`,
    natal.timeUnknown ? '（时辰未知，结果仅供参考）' : '',
    ...natal.palaces.map((p) => `${p.name}：${p.majorStars.join('、') || '空宫'}`),
  ];
  if (horoscope) {
    lines.push(
      `【当前大限】${horoscope.decadal.range} ${horoscope.decadal.palace} ${horoscope.decadal.majorStars.join('、')}`,
      `【${horoscope.yearly.year}流年】${horoscope.yearly.palace} ${horoscope.yearly.majorStars.join('、')} 四化:${horoscope.yearly.mutagen.join('、')}`,
    );
  }
  return lines.filter(Boolean).join('\n');
}

export function buildFlyingStarAppendix(input: BirthInput, year?: number): string {
  const h = buildHoroscope(input, year);
  return `流年四化引动（飞星附录）：${h.yearly.mutagen.join('、') || '无'}；流年宫位：${h.yearly.palace}；主星：${h.yearly.majorStars.join('、') || '无'}`;
}
