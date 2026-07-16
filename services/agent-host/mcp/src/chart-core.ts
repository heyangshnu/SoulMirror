import { createHash } from 'node:crypto';
import { astro } from 'iztro';
import lunarJavascript from 'lunar-javascript';

const Solar = (lunarJavascript as unknown as { Solar: unknown }).Solar as {
  fromYmdHms: (year: number, month: number, day: number, hour: number, minute: number, second: number) => unknown;
};

export interface BirthProfileInput {
  personId?: string;
  gender: string;
  birthDateTime: string;
  timezone?: string;
  birthPlace?: string | null;
  accuracy?: Record<string, unknown>;
}

export interface ChartAsset {
  chart_asset_id: string;
  asset_version: string;
  created_at: string;
  person_id?: string;
  birth_profile: {
    gender: string;
    birthDateTime: string;
    timezone: string;
    birthPlace: string | null;
    accuracy: Record<string, unknown>;
  };
  calculation_profile: Record<string, unknown>;
  doctrine_profile: Record<string, unknown>;
  uncertainty: Record<string, unknown>;
  bazi: unknown;
  ziwei: unknown;
  current_period: unknown;
}

export function normalizeBirthProfile(args: Record<string, unknown> | BirthProfileInput): BirthProfileInput {
  const gender = requireString(args.gender, 'gender');
  const birthDateTime = requireString(args.birthDateTime, 'birthDateTime');
  if (gender !== 'male' && gender !== 'female') {
    throw new Error('gender must be "male" or "female" for deterministic BaZi/Ziwei chart calculation');
  }
  return {
    personId: optionalString(args.personId) ?? undefined,
    gender,
    birthDateTime,
    timezone: optionalString(args.timezone) ?? 'Asia/Shanghai',
    birthPlace: optionalString(args.birthPlace),
    accuracy: isRecord(args.accuracy) ? args.accuracy : { time: 'exact', place: optionalString(args.birthPlace) ? 'provided' : 'missing' },
  };
}

export function createChartAsset(args: Record<string, unknown> | BirthProfileInput, now = new Date()): ChartAsset {
  const profile = normalizeBirthProfile(args);
  const bazi = calculateBazi(profile);
  const ziwei = calculateZiwei(profile);
  const current_period = calculatePeriods({ ...profile, targetYear: String(now.getFullYear()) });
  const calculation_profile = getCalculationProfile(profile);
  const doctrine_profile = getDoctrineProfile();
  const canonical = stableStringify({
    birth_profile: {
      gender: profile.gender,
      birthDateTime: profile.birthDateTime,
      timezone: profile.timezone,
      birthPlace: profile.birthPlace ?? null,
      accuracy: profile.accuracy,
    },
    calculation_profile,
    doctrine_profile,
  });
  return {
    chart_asset_id: `chart_${createHash('sha256').update(canonical).digest('hex').slice(0, 24)}`,
    asset_version: 'chart_asset_l0_v1',
    created_at: now.toISOString(),
    person_id: profile.personId,
    birth_profile: {
      gender: profile.gender,
      birthDateTime: profile.birthDateTime,
      timezone: profile.timezone ?? 'Asia/Shanghai',
      birthPlace: profile.birthPlace ?? null,
      accuracy: profile.accuracy ?? {},
    },
    calculation_profile,
    doctrine_profile,
    uncertainty: getUncertainty(profile),
    bazi,
    ziwei,
    current_period,
  };
}

export function renderChartAssetMarkdown(asset: ChartAsset) {
  const bazi = asset.bazi as Record<string, unknown>;
  const ziwei = asset.ziwei as Record<string, unknown>;
  const eightChar = (bazi.eightChar ?? {}) as Record<string, unknown>;
  const ziweiChart = (ziwei.chart ?? {}) as Record<string, unknown>;
  const currentPeriod = asset.current_period as Record<string, unknown>;
  return [
    `# L0 排盘事实档案 ${asset.chart_asset_id}`,
    '',
    '本文件只记录排盘事实、计算规则、默认解读版本和不确定性，不写命理解读判断。',
    '',
    '## Chart Asset',
    '',
    `- chart_asset_id: ${asset.chart_asset_id}`,
    `- asset_version: ${asset.asset_version}`,
    `- created_at: ${asset.created_at}`,
    `- person_id: ${asset.person_id ?? '(none)'}`,
    '',
    '## Birth Profile',
    '',
    `- gender: ${asset.birth_profile.gender}`,
    `- birthDateTime: ${asset.birth_profile.birthDateTime}`,
    `- timezone: ${asset.birth_profile.timezone}`,
    `- birthPlace: ${asset.birth_profile.birthPlace ?? '(missing)'}`,
    `- accuracy: ${JSON.stringify(asset.birth_profile.accuracy)}`,
    '',
    '## Calculation Profile',
    '',
    fencedJson(asset.calculation_profile),
    '',
    '## Doctrine Profile',
    '',
    fencedJson(asset.doctrine_profile),
    '',
    '## Uncertainty',
    '',
    fencedJson(asset.uncertainty),
    '',
    '## BaZi Facts',
    '',
    `- 年柱: ${eightChar.year ?? ''}`,
    `- 月柱: ${eightChar.month ?? ''}`,
    `- 日柱: ${eightChar.day ?? ''}`,
    `- 时柱: ${eightChar.time ?? ''}`,
    `- 天干: ${[eightChar.yearGan, eightChar.monthGan, eightChar.dayGan, eightChar.timeGan].filter(Boolean).join(' / ')}`,
    `- 地支: ${[eightChar.yearZhi, eightChar.monthZhi, eightChar.dayZhi, eightChar.timeZhi].filter(Boolean).join(' / ')}`,
    '',
    '完整八字结构见同名 JSON asset。',
    '',
    '## Ziwei Facts',
    '',
    `- 阳历: ${ziweiChart.solarDate ?? ''}`,
    `- 农历: ${ziweiChart.lunarDate ?? ''}`,
    `- 时辰范围: ${ziweiChart.timeRange ?? ''}`,
    `- 命宫: ${ziweiChart.soul ?? ''}`,
    `- 身宫: ${ziweiChart.body ?? ''}`,
    `- 五行局: ${ziweiChart.fiveElementsClass ?? ''}`,
    '',
    '完整十二宫、星曜、四化、大限与运限结构见同名 JSON asset。',
    '',
    '## Current Period Index',
    '',
    fencedJson({
      targetYear: currentPeriod.targetYear,
      note: '当前周期索引用于伏羲节点定位；解释由伏羲完成。',
    }),
    '',
  ].join('\n');
}

export function renderChartAssetContextMarkdown(asset: ChartAsset) {
  const bazi = asset.bazi as Record<string, unknown>;
  const ziwei = asset.ziwei as Record<string, unknown>;
  const eightChar = (bazi.eightChar ?? {}) as Record<string, unknown>;
  const luckCycles = ((eightChar.luckCycles ?? {}) as Record<string, unknown>);
  const ziweiChart = (ziwei.chart ?? {}) as Record<string, unknown>;
  const palaces = Array.isArray(ziweiChart.palaces) ? ziweiChart.palaces as Array<Record<string, unknown>> : [];
  const daYun = Array.isArray(luckCycles.daYun) ? luckCycles.daYun as Array<Record<string, unknown>> : [];
  const currentPeriod = asset.current_period as Record<string, unknown>;
  const horoscope = (currentPeriod.horoscope ?? {}) as Record<string, unknown>;
  const decadal = (horoscope.decadal ?? {}) as Record<string, unknown>;

  return [
    `# L0 模型事实上下文 ${asset.chart_asset_id}`,
    '',
    '本文件只整理排盘事实，便于伏羲读取。它不是命理解读，不写判断，不替代完整 JSON asset。',
    '',
    '## Source',
    '',
    `- chart_asset_id: ${asset.chart_asset_id}`,
    `- json_asset: 01_命/_chart_assets/${asset.chart_asset_id}.json`,
    `- l0_fact_file: 01_命/L0_排盘事实档案.md`,
    `- calculation_profile: ${String(asset.calculation_profile.profile_id ?? '')}`,
    `- doctrine_profile: ${String(asset.doctrine_profile.profile_id ?? '')}`,
    `- uncertainty: ${JSON.stringify(asset.uncertainty)}`,
    '',
    '## Birth Profile',
    '',
    `- gender: ${asset.birth_profile.gender}`,
    `- birthDateTime: ${asset.birth_profile.birthDateTime}`,
    `- timezone: ${asset.birth_profile.timezone}`,
    `- birthPlace: ${asset.birth_profile.birthPlace ?? '(missing)'}`,
    `- accuracy: ${JSON.stringify(asset.birth_profile.accuracy)}`,
    '',
    '## BaZi Core Facts',
    '',
    `- 四柱: ${[eightChar.year, eightChar.month, eightChar.day, eightChar.time].filter(Boolean).join(' / ')}`,
    `- 天干: ${[eightChar.yearGan, eightChar.monthGan, eightChar.dayGan, eightChar.timeGan].filter(Boolean).join(' / ')}`,
    `- 地支: ${[eightChar.yearZhi, eightChar.monthZhi, eightChar.dayZhi, eightChar.timeZhi].filter(Boolean).join(' / ')}`,
    `- 藏干: ${formatJson(eightChar.hiddenStems)}`,
    `- 五行: ${formatJson(eightChar.fiveElements)}`,
    `- 十神: ${formatJson(eightChar.tenGods)}`,
    `- 起运: startYear=${String(luckCycles.startYear ?? '')}, startMonth=${String(luckCycles.startMonth ?? '')}, startDay=${String(luckCycles.startDay ?? '')}, startSolar=${String(luckCycles.startSolar ?? '')}, forward=${String(luckCycles.forward ?? '')}`,
    '',
    '## BaZi DaYun Facts',
    '',
    ...daYun.map((item) => `- index ${String(item.index ?? '')}: ${String(item.ganZhi ?? '(empty)')} | ${String(item.startYear ?? '')}-${String(item.endYear ?? '')} | age ${String(item.startAge ?? '')}-${String(item.endAge ?? '')}`),
    '',
    '## Ziwei Core Facts',
    '',
    `- solarDate: ${String(ziweiChart.solarDate ?? '')}`,
    `- lunarDate: ${String(ziweiChart.lunarDate ?? '')}`,
    `- chineseDate: ${String(ziweiChart.chineseDate ?? '')}`,
    `- timeRange: ${String(ziweiChart.timeRange ?? '')}`,
    `- gender: ${String(ziweiChart.gender ?? '')}`,
    `- 命宫主星/命主: ${String(ziweiChart.soul ?? '')}`,
    `- 身宫/身主: ${String(ziweiChart.body ?? '')}`,
    `- 五行局: ${String(ziweiChart.fiveElementsClass ?? '')}`,
    '',
    '## Ziwei Palace Facts',
    '',
    ...palaces.map(renderPalaceFactLine),
    '',
    '## Current Period Facts',
    '',
    `- targetYear: ${String(currentPeriod.targetYear ?? '')}`,
    `- decadal: index=${String(decadal.index ?? '')}, name=${String(decadal.name ?? '')}, stem=${String(decadal.heavenlyStem ?? '')}, branch=${String(decadal.earthlyBranch ?? '')}`,
    `- decadal palaceNames: ${formatList(decadal.palaceNames)}`,
    `- decadal mutagen: ${formatList(decadal.mutagen)}`,
    '',
    '## Reading Rule',
    '',
    '伏羲节点优先读取本文件。只有本文件不足以支撑某个节点时，才读取同 chart_asset_id 的完整 JSON asset。',
    '',
  ].join('\n');
}

export function calculateBazi(args: Record<string, unknown> | BirthProfileInput) {
  const profile = normalizeBirthProfile(args);
  const parsed = parseDateTime(profile.birthDateTime);
  const solar = Solar.fromYmdHms(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, parsed.second);
  const eight = getEightChar(solar, profile.gender);
  return {
    engine: { name: 'lunar-javascript', version: '1.7.7' },
    input: normalizedInput(profile),
    calculationProfile: getCalculationProfile(profile).bazi,
    uncertainty: getUncertainty(profile),
    solar: toPlain(solar),
    ...eight,
  };
}

export function calculateZiwei(args: Record<string, unknown> | BirthProfileInput) {
  const profile = normalizeBirthProfile(args);
  const parsed = parseDateTime(profile.birthDateTime);
  const astrolabe = astro.bySolar(`${parsed.solarDate} ${parsed.solarTime}`, timeIndex(parsed.hour), genderLabel(profile.gender), true, 'zh-CN');
  return {
    engine: { name: 'iztro', version: '2.5.8' },
    input: normalizedInput(profile),
    calculationProfile: getCalculationProfile(profile).ziwei,
    uncertainty: getUncertainty(profile),
    chart: {
      solarDate: astrolabe.solarDate,
      lunarDate: astrolabe.lunarDate,
      chineseDate: astrolabe.chineseDate,
      timeRange: astrolabe.timeRange,
      gender: astrolabe.gender,
      soul: astrolabe.soul,
      body: astrolabe.body,
      fiveElementsClass: astrolabe.fiveElementsClass,
      palaces: mapPalaces(astrolabe),
    },
  };
}

export function calculatePeriods(args: Record<string, unknown> | (BirthProfileInput & { targetYear?: string })) {
  const profile = normalizeBirthProfile(args);
  const parsed = parseDateTime(profile.birthDateTime);
  const targetYear = Number(optionalString((args as Record<string, unknown>).targetYear) ?? new Date().getFullYear());
  const astrolabe = astro.bySolar(`${parsed.solarDate} ${parsed.solarTime}`, timeIndex(parsed.hour), genderLabel(profile.gender), true, 'zh-CN');
  const horoscope = astrolabe.horoscope(new Date(`${targetYear}-06-01T12:00:00+08:00`));
  return {
    engine: { name: 'iztro', version: '2.5.8' },
    targetYear,
    input: normalizedInput(profile),
    calculationProfile: getCalculationProfile(profile).ziwei,
    horoscope: toPlain(horoscope),
  };
}

export function calculateCurrentPeriod(args: Record<string, unknown> | BirthProfileInput) {
  const targetYear = new Date().getFullYear();
  return {
    bazi: calculateBazi(args),
    ziwei: calculateZiwei(args),
    periods: calculatePeriods({ ...normalizeBirthProfile(args), targetYear: String(targetYear) }),
  };
}

function getCalculationProfile(profile: BirthProfileInput) {
  return {
    profile_id: 'calculation_profile_lunar_iztro_default_v1',
    time_standard: 'provided_local_civil_time',
    timezone: profile.timezone ?? 'Asia/Shanghai',
    birth_place: profile.birthPlace ?? null,
    true_solar_time: 'not_applied',
    bazi: {
      engine: 'lunar-javascript',
      engine_version: '1.7.7',
      calendar_rule: 'solar_terms_month',
      year_boundary: 'lunar_javascript_default',
      day_boundary: 'lunar_javascript_eight_char_sect_2_default',
      sect: 2,
      true_solar_time: 'not_applied',
    },
    ziwei: {
      engine: 'iztro',
      engine_version: '2.5.8',
      algorithm: 'default',
      fixLeap: true,
      language: 'zh-CN',
      time_index_rule: 'Math.floor((hour + 1) / 2) % 12',
      true_solar_time: 'not_applied',
    },
  };
}

function getDoctrineProfile() {
  return {
    profile_id: 'doctrine_profile_fuxi_default_v1',
    bazi: 'ziping_wangshuai_geju_tiaohou_liutong_v1',
    bazi_components: ['子平基础', '月令旺衰', '格局结构', '调候', '五行流通/病药', '十神现实转译'],
    ziwei: 'sanhe_body_sihua_flow_v1',
    ziwei_components: ['三合为体', '四化为用', '大限/流年作为时间主场', '中州思路作综合参考'],
    reality_calibration: 'enabled',
    note: 'Doctrine Profile guides Fuxi interpretation. It is not a chart calculation rule.',
  };
}

function getUncertainty(profile: BirthProfileInput) {
  return {
    birth_place: profile.birthPlace ? 'provided' : 'missing',
    true_solar_time: 'not_applied',
    timezone: profile.timezone ?? 'Asia/Shanghai',
    accuracy: profile.accuracy ?? {},
    edge_case_policy: {
      zi_hour_boundary: 'recorded_by_calculation_profile; not silently normalized',
      solar_term_boundary: 'recorded_by_engine_output; boundary cases require validation note',
      leap_month: 'ziwei_fixLeap_true; leap-month handling must be recorded in asset',
    },
    note: 'If birthplace, true solar time, zi-hour rule, solar-term boundary, or Ziwei algorithm changes, generate a new chart_asset_id.',
  };
}

function normalizedInput(profile: BirthProfileInput) {
  return {
    personId: profile.personId,
    gender: profile.gender,
    birthDateTime: profile.birthDateTime,
    timezone: profile.timezone ?? 'Asia/Shanghai',
    birthPlace: profile.birthPlace ?? null,
    accuracy: profile.accuracy ?? {},
  };
}

function parseDateTime(input: string) {
  const match = input.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/,
  );
  if (!match) throw new Error(`Invalid birthDateTime: ${input}`);
  const [, yearText, monthText, dayText, hourText = '0', minuteText = '0', secondText = '0'] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
    || hour > 23
    || minute > 59
    || second > 59
  ) {
    throw new Error(`Invalid birthDateTime: ${input}`);
  }
  return {
    date,
    year,
    month,
    day,
    hour,
    minute,
    second,
    solarDate: `${yearText}-${monthText}-${dayText}`,
    solarTime: `${hourText}:${minuteText}`,
  };
}

function genderLabel(gender: string): '男' | '女' {
  if (gender === 'male') return '男';
  if (gender === 'female') return '女';
  throw new Error(`Unsupported gender for chart calculation: ${gender}`);
}

function timeIndex(hour: number) {
  return Math.floor((hour + 1) / 2) % 12;
}

function getEightChar(solar: unknown, gender: string) {
  const lunar = (solar as { getLunar?: () => unknown }).getLunar?.();
  const eightChar = (lunar as { getEightChar?: () => unknown } | undefined)?.getEightChar?.();
  const get = (method: string) => {
    const fn = (eightChar as Record<string, unknown> | undefined)?.[method];
    return typeof fn === 'function' ? String(fn.call(eightChar)) : '';
  };
  const getArray = (method: string) => {
    const fn = (eightChar as Record<string, unknown> | undefined)?.[method];
    const value = typeof fn === 'function' ? fn.call(eightChar) : [];
    return Array.isArray(value) ? value.map(String) : [];
  };
  return {
    lunar: toPlain(lunar),
    eightChar: {
      year: get('getYear'),
      month: get('getMonth'),
      day: get('getDay'),
      time: get('getTime'),
      yearGan: get('getYearGan'),
      yearZhi: get('getYearZhi'),
      monthGan: get('getMonthGan'),
      monthZhi: get('getMonthZhi'),
      dayGan: get('getDayGan'),
      dayZhi: get('getDayZhi'),
      timeGan: get('getTimeGan'),
      timeZhi: get('getTimeZhi'),
      hiddenStems: {
        year: getArray('getYearHideGan'),
        month: getArray('getMonthHideGan'),
        day: getArray('getDayHideGan'),
        time: getArray('getTimeHideGan'),
      },
      fiveElements: {
        year: get('getYearWuXing'),
        month: get('getMonthWuXing'),
        day: get('getDayWuXing'),
        time: get('getTimeWuXing'),
      },
      tenGods: {
        heavenlyStems: {
          year: get('getYearShiShenGan'),
          month: get('getMonthShiShenGan'),
          day: get('getDayShiShenGan'),
          time: get('getTimeShiShenGan'),
        },
        earthlyBranches: {
          year: getArray('getYearShiShenZhi'),
          month: getArray('getMonthShiShenZhi'),
          day: getArray('getDayShiShenZhi'),
          time: getArray('getTimeShiShenZhi'),
        },
      },
      luckCycles: getLuckCycles(eightChar, gender),
    },
    rawEightChar: toPlain(eightChar),
  };
}

function getLuckCycles(eightChar: unknown, gender: string) {
  const fn = (eightChar as Record<string, unknown> | undefined)?.getYun;
  if (typeof fn !== 'function') return null;
  try {
    const yun = fn.call(eightChar, gender === 'male' ? 1 : 0, 2);
    const daYunFn = (yun as Record<string, unknown>)?.getDaYun;
    const daYun = typeof daYunFn === 'function' ? daYunFn.call(yun, 12) : [];
    return {
      startYear: callString(yun, 'getStartYear'),
      startMonth: callString(yun, 'getStartMonth'),
      startDay: callString(yun, 'getStartDay'),
      startSolar: callNestedString(yun, 'getStartSolar', 'toYmd'),
      forward: callString(yun, 'isForward'),
      daYun: Array.isArray(daYun) ? daYun.map((item) => ({
        index: callString(item, 'getIndex'),
        ganZhi: callString(item, 'getGanZhi'),
        startYear: callString(item, 'getStartYear'),
        endYear: callString(item, 'getEndYear'),
        startAge: callString(item, 'getStartAge'),
        endAge: callString(item, 'getEndAge'),
      })) : [],
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      note: 'BaZi luck cycle extraction failed; raw chart facts remain available.',
    };
  }
}

function mapPalaces(astrolabe: ReturnType<typeof astro.bySolar>) {
  return astrolabe.palaces.map((palace) => ({
    name: palace.name,
    heavenlyStem: palace.heavenlyStem,
    earthlyBranch: palace.earthlyBranch,
    isBodyPalace: palace.isBodyPalace,
    isOriginalPalace: palace.isOriginalPalace,
    majorStars: (palace.majorStars ?? []).map((star) => ({
      name: star.name,
      brightness: star.brightness ?? '',
      mutagen: star.mutagen ?? '',
    })),
    minorStars: [...(palace.minorStars ?? []), ...(palace.adjectiveStars ?? [])].map((star) => ({
      name: star.name,
      type: (star as unknown as { type?: string }).type ?? '',
      brightness: (star as unknown as { brightness?: string }).brightness ?? '',
      mutagen: (star as unknown as { mutagen?: string }).mutagen ?? '',
    })),
    changsheng12: palace.changsheng12,
    boshi12: palace.boshi12,
    jiangqian12: palace.jiangqian12,
    suiqian12: palace.suiqian12,
    decadal: palace.decadal,
    ages: palace.ages,
  }));
}

function callString(target: unknown, method: string) {
  const fn = (target as Record<string, unknown> | undefined)?.[method];
  return typeof fn === 'function' ? String(fn.call(target)) : '';
}

function callNestedString(target: unknown, method: string, nestedMethod: string) {
  const fn = (target as Record<string, unknown> | undefined)?.[method];
  const nested = typeof fn === 'function' ? fn.call(target) : null;
  return callString(nested, nestedMethod);
}

function toPlain(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) return '[Circular]';
  if (depth > 6) return '[MaxDepth]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => toPlain(item, seen, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item !== 'function') result[key] = toPlain(item, seen, depth + 1);
  }
  seen.delete(value);
  return result;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

function fencedJson(value: unknown) {
  return ['```json', JSON.stringify(value, null, 2), '```'].join('\n');
}

function renderPalaceFactLine(palace: Record<string, unknown>) {
  const majorStars = Array.isArray(palace.majorStars) ? palace.majorStars : [];
  const minorStars = Array.isArray(palace.minorStars) ? palace.minorStars : [];
  const major = majorStars.map(formatStar).filter(Boolean).join('、') || '(none)';
  const minor = minorStars.map(formatStar).filter(Boolean).join('、') || '(none)';
  const decadal = (palace.decadal ?? {}) as Record<string, unknown>;
  return [
    `- ${String(palace.name ?? '')}`,
    `干支 ${String(palace.heavenlyStem ?? '')}${String(palace.earthlyBranch ?? '')}`,
    `body=${String(palace.isBodyPalace ?? false)}`,
    `original=${String(palace.isOriginalPalace ?? false)}`,
    `major=${major}`,
    `minor=${minor}`,
    `长生=${String(palace.changsheng12 ?? '')}`,
    `博士=${String(palace.boshi12 ?? '')}`,
    `将前=${String(palace.jiangqian12 ?? '')}`,
    `岁前=${String(palace.suiqian12 ?? '')}`,
    `decadal=${String(decadal.range ?? '')}/${String(decadal.heavenlyStem ?? '')}${String(decadal.earthlyBranch ?? '')}`,
    `ages=${formatList(palace.ages)}`,
  ].join(' | ');
}

function formatStar(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const star = value as Record<string, unknown>;
  const parts = [
    String(star.name ?? ''),
    star.brightness ? `(${String(star.brightness)})` : '',
    star.mutagen ? `[${String(star.mutagen)}]` : '',
  ].filter(Boolean);
  return parts.join('');
}

function formatList(value: unknown) {
  return Array.isArray(value) ? value.map(String).join(' / ') : String(value ?? '');
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {});
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} must be a non-empty string`);
  return value.trim();
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
