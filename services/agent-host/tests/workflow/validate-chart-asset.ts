import assert from 'node:assert/strict';
import { createChartAsset, renderChartAssetMarkdown } from '../../mcp/src/chart-core.js';

const samples = [
  {
    name: 'ordinary male no birthplace',
    input: {
      personId: 'sample-male',
      gender: 'male',
      birthDateTime: '1990-05-20T14:30:00',
      timezone: 'Asia/Shanghai',
      accuracy: { time: 'exact', place: 'missing' },
    },
  },
  {
    name: 'ordinary female birthplace provided',
    input: {
      personId: 'sample-female',
      gender: 'female',
      birthDateTime: '1988-11-03T06:15:00',
      timezone: 'Asia/Shanghai',
      birthPlace: 'Shanghai',
      accuracy: { time: 'exact', place: 'provided' },
    },
  },
  {
    name: 'zi hour boundary',
    input: {
      personId: 'sample-zi-hour',
      gender: 'male',
      birthDateTime: '1992-01-01T23:30:00',
      timezone: 'Asia/Shanghai',
      accuracy: { time: 'exact', place: 'missing' },
    },
  },
  {
    name: 'solar term boundary candidate',
    input: {
      personId: 'sample-solar-term',
      gender: 'female',
      birthDateTime: '2020-02-04T17:03:00',
      timezone: 'Asia/Shanghai',
      accuracy: { time: 'estimated', place: 'missing' },
    },
  },
  {
    name: 'tesla historical estimated',
    input: {
      personId: 'tesla-demo',
      gender: 'male',
      birthDateTime: '1856-07-10T00:00:00',
      timezone: 'Europe/Belgrade',
      birthPlace: 'Smiljan',
      accuracy: { time: 'estimated', place: 'provided' },
    },
  },
];

for (const sample of samples) {
  const asset = createChartAsset(sample.input, new Date('2026-06-13T00:00:00.000Z'));
  const second = createChartAsset(sample.input, new Date('2026-06-13T00:00:00.000Z'));
  assert.equal(asset.chart_asset_id, second.chart_asset_id, `${sample.name}: chart_asset_id must be deterministic`);
  assert.match(asset.chart_asset_id, /^chart_[0-9a-f]{24}$/u, `${sample.name}: invalid chart_asset_id`);
  assert.equal(asset.asset_version, 'chart_asset_l0_v1');
  assert.equal(asset.calculation_profile.profile_id, 'calculation_profile_lunar_iztro_default_v1');
  assert.equal(asset.doctrine_profile.bazi, 'ziping_wangshuai_geju_tiaohou_liutong_v1');
  assert.equal(asset.doctrine_profile.ziwei, 'sanhe_body_sihua_flow_v1');
  assert.equal(asset.uncertainty.true_solar_time, 'not_applied');
  assert.ok((asset.bazi as { eightChar?: unknown }).eightChar, `${sample.name}: missing bazi eightChar`);
  assert.ok((asset.ziwei as { chart?: { palaces?: unknown[] } }).chart?.palaces?.length === 12, `${sample.name}: ziwei must have 12 palaces`);
  assert.ok((asset.current_period as { targetYear?: number }).targetYear === 2026, `${sample.name}: current period target year`);
  const markdown = renderChartAssetMarkdown(asset);
  assert.ok(markdown.includes(asset.chart_asset_id), `${sample.name}: markdown missing id`);
  assert.ok(markdown.includes('L0 排盘事实档案'), `${sample.name}: markdown missing L0 title`);
}

console.log(`Chart asset validation passed for ${samples.length} samples.`);
