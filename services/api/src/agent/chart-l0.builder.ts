import { createHash } from 'node:crypto';
import {
  buildHoroscope,
  buildNatalChart,
  type BirthInput,
} from '@soulmirror/chart';
import { buildBaziSummary } from '@soulmirror/bazi';
import type { AgentBirthPayload } from './agent.constants';

/** ChartAsset shape aligned with agent-host `mcp/src/chart-core.ts` */
export interface L0ChartAsset {
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

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function birthPayloadToChartInput(payload: AgentBirthPayload): BirthInput {
  const [datePart, timePart = '12:00:00'] = payload.birthDateTime.split('T');
  const accuracy = payload.accuracy ?? {};
  return {
    birthDate: datePart,
    birthTime: timePart.slice(0, 8),
    gender: payload.gender as 'male' | 'female',
    calendar: (accuracy.calendar as 'solar' | 'lunar') ?? 'solar',
    isLeapMonth: Boolean(accuracy.isLeapMonth),
    birthPlace: payload.birthPlace ?? undefined,
    longitude: typeof accuracy.longitude === 'number' ? accuracy.longitude : undefined,
    timeUnknown: accuracy.time === 'unknown',
  };
}

export function buildL0ChartAsset(
  slug: string,
  payload: AgentBirthPayload,
  now = new Date(),
): L0ChartAsset {
  const input = birthPayloadToChartInput(payload);
  const natal = buildNatalChart(input);
  const horoscope = buildHoroscope(input);
  const baziSummary = buildBaziSummary(natal.pillars);

  const calculation_profile = {
    engine: '@soulmirror/chart',
    algorithm_version: natal.algorithmVersion,
    calendar: input.calendar ?? 'solar',
    true_solar_time: natal.trueSolarTimeApplied ? 'applied' : 'not_applied',
    solar_time_offset_minutes: natal.solarTimeOffsetMinutes,
    longitude: natal.longitude,
    source: 'soulmirror-api-l0-bridge',
  };

  const doctrine_profile = {
    ziwei_school: 'sanhe',
    interpretation_boundary: 'facts_only',
  };

  const canonical = stableStringify({
    birth_profile: {
      gender: payload.gender,
      birthDateTime: payload.birthDateTime,
      timezone: payload.timezone,
      birthPlace: payload.birthPlace ?? null,
      accuracy: payload.accuracy,
    },
    calculation_profile,
    doctrine_profile,
  });

  return {
    chart_asset_id: `chart_${createHash('sha256').update(canonical).digest('hex').slice(0, 24)}`,
    asset_version: 'chart_asset_l0_v1_soulmirror',
    created_at: now.toISOString(),
    person_id: slug,
    birth_profile: {
      gender: payload.gender,
      birthDateTime: payload.birthDateTime,
      timezone: payload.timezone ?? 'Asia/Shanghai',
      birthPlace: payload.birthPlace ?? null,
      accuracy: payload.accuracy ?? {},
    },
    calculation_profile,
    doctrine_profile,
    uncertainty: {
      time: payload.accuracy?.time === 'unknown' ? 'birth_time_unknown' : 'exact',
      place: payload.birthPlace ? 'provided' : 'missing',
    },
    bazi: {
      summary: baziSummary,
      pillars: natal.pillars,
      lunarDate: natal.lunarDate,
      solarDate: natal.solarDate,
    },
    ziwei: {
      natal,
      palaces: natal.palaces,
      fiveElementsClass: natal.fiveElementsClass,
      soul: natal.soul,
      body: natal.body,
    },
    current_period: horoscope,
  };
}
