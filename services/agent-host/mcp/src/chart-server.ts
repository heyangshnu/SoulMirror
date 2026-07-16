import 'dotenv/config';
import {
  calculateBazi,
  calculateCurrentPeriod,
  calculatePeriods,
  calculateZiwei,
  createChartAsset,
} from './chart-core.js';
import {
  jsonProp,
  objectSchema,
  startMcpServer,
  stringProp,
  type ToolSpec,
} from './common.js';

const birthProperties = {
  personId: stringProp(),
  gender: stringProp(),
  birthDateTime: stringProp(),
  timezone: stringProp(),
  birthPlace: stringProp(),
  accuracy: jsonProp(),
};

const tools: ToolSpec[] = [
  {
    name: 'chart.calculate_asset',
    description: 'Calculate the full deterministic L0 chart asset for BaZi and Ziwei. This tool returns facts and profiles only; it does not interpret.',
    inputSchema: objectSchema(birthProperties, ['birthDateTime', 'gender']),
    handler: async (args) => createChartAsset(args),
  },
  {
    name: 'chart.calculate_bazi',
    description: 'Calculate BaZi calendar/eight-character structures. This tool does not interpret personality or fate.',
    inputSchema: objectSchema(birthProperties, ['birthDateTime', 'gender']),
    handler: async (args) => calculateBazi(args),
  },
  {
    name: 'chart.calculate_ziwei',
    description: 'Calculate Ziwei astrolabe structures. This tool does not interpret personality or fate.',
    inputSchema: objectSchema(birthProperties, ['birthDateTime', 'gender']),
    handler: async (args) => calculateZiwei(args),
  },
  {
    name: 'chart.calculate_periods',
    description: 'Return Ziwei horoscope period structures for a target year.',
    inputSchema: objectSchema({
      ...birthProperties,
      targetYear: stringProp(),
    }, ['birthDateTime', 'gender']),
    handler: async (args) => calculatePeriods(args),
  },
  {
    name: 'chart.calculate_current_period',
    description: 'Return current-year period structures. Interpretation belongs to the agent skill.',
    inputSchema: objectSchema(birthProperties, ['birthDateTime', 'gender']),
    handler: async (args) => calculateCurrentPeriod(args),
  },
];

await startMcpServer('fate-and-fortune-chart', '0.2.0', tools);
