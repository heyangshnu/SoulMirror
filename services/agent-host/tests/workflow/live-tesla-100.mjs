// Live 100 strict QA: set FUXI_INIT_GATE=full on agent-host before running.
import fs from 'node:fs/promises';
import path from 'node:path';
import WebSocket from 'ws';
import { teslaRealisticUserTurns } from '../fixtures/tesla-realistic-user-turns.zh.mjs';

const slug = process.env.FATE_TEST_SLUG || 'tesla-demo';
const baseUrl = process.env.FATE_TEST_URL || `http://127.0.0.1:${process.env.PORT || 8787}`;
const wsUrl = `${baseUrl.replace(/^http/u, 'ws').replace(/\/$/u, '')}/ws?slug=${encodeURIComponent(slug)}`;
const outDir = path.resolve('tests/output');
const startIndex = parseIndexEnv('FATE_TEST_START_INDEX', 0);
const endIndex = parseIndexEnv('FATE_TEST_END_INDEX', 100);
const rangeLabel = startIndex > 0 || endIndex < 100 ? `-turns-${startIndex + 1}-${endIndex}` : '';
const outPath = path.join(outDir, `live-tesla-100${rangeLabel}-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);

const teslaBirth = {
  type: 'start',
  gender: 'male',
  birthDateTime: '1856-07-10T00:00:00',
  timezone: 'Europe/Belgrade',
  birthPlace: 'Smiljan',
  accuracy: {
    time: 'estimated',
    place: 'provided',
  },
};

const teslaTurns = teslaRealisticUserTurns;
if (teslaTurns.length !== 100) {
  throw new Error(`Tesla live fixture must contain exactly 100 turns, got ${teslaTurns.length}.`);
}
if (startIndex < 0 || startIndex >= teslaTurns.length || endIndex <= startIndex || endIndex > teslaTurns.length) {
  throw new Error(`Invalid turn range: start=${startIndex}, end=${endIndex}, total=${teslaTurns.length}.`);
}

await fs.mkdir(outDir, { recursive: true });
const ws = new WebSocket(wsUrl);
const events = [];

ws.on('message', async (raw) => {
  const event = JSON.parse(String(raw));
  events.push(event);
  await fs.appendFile(outPath, `${JSON.stringify(event)}\n`, 'utf8');
});

await waitForOpen(ws);
console.log(`Connected to ${wsUrl}`);
ws.send(JSON.stringify(teslaBirth));

const init = await waitForFuxiInitialization(60 * 60 * 1000);
if (init.type !== 'fuxi_init_done' || init.failed > 0) {
  console.error(`Initialization did not complete: ${init.type} ${init.message || ''}`);
  console.error(`Report: ${outPath}`);
  ws.close();
  process.exit(2);
}

for (let i = startIndex; i < endIndex; i += 1) {
  const text = teslaTurns[i];
  const beforeTurnEventCount = events.length;
  ws.send(JSON.stringify({ type: 'message', text }));
  const done = await waitForEvent(['turn_done', 'config_error', 'gongcao_route_error', 'agent_contract_error'], 45 * 60 * 1000);
  if (done.type !== 'turn_done') {
    console.error(`Turn ${i + 1} failed: ${done.type} ${done.message || ''}`);
    console.error(`Report: ${outPath}`);
    ws.close();
    process.exit(3);
  }
  const idle = await waitForEvent(['background_idle', 'config_error', 'gongcao_route_error', 'gongcao_error', 'agent_contract_error'], 45 * 60 * 1000);
  if (idle.type !== 'background_idle') {
    console.error(`Turn ${i + 1} background failed: ${idle.type} ${idle.message || ''}`);
    console.error(`Report: ${outPath}`);
    ws.close();
    process.exit(4);
  }
  const turnContractErrors = events
    .slice(beforeTurnEventCount)
    .filter((event) => event.type === 'agent_contract_error');
  if (turnContractErrors.length > 0) {
    console.error(`Turn ${i + 1} contract errors: ${JSON.stringify(turnContractErrors)}`);
    console.error(`Report: ${outPath}`);
    ws.close();
    process.exit(5);
  }
  console.log(`Turn ${i + 1}/100 done + background idle`);
}

ws.close();
const summary = summarize(events);
await fs.writeFile(outPath.replace(/\.jsonl$/u, '.summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log('Live Tesla 100 completed.');
console.log(`Events: ${outPath}`);
console.log(JSON.stringify(summary, null, 2));

function waitForOpen(socket) {
  return new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
}

function parseIndexEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer, got ${raw}.`);
  }
  return value;
}

function waitForEvent(types, timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const interval = setInterval(() => {
      const found = events.find((event) => types.includes(event.type) && !event.__consumed);
      if (found) {
        found.__consumed = true;
        clearInterval(interval);
        resolve(found);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Timed out waiting for ${types.join(', ')}`));
      }
    }, 500);
  });
}

async function waitForFuxiInitialization(timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const event = await waitForEvent(['fuxi_init_done', 'fuxi_init_failed'], timeoutMs - (Date.now() - started));
    if (event.type === 'fuxi_init_failed') return event;
    if (event.type === 'fuxi_init_done' && !event.failed && !event.skipped) return event;
  }
  throw new Error('Timed out waiting for Fuxi initialization result');
}

function summarize(items) {
  const counts = {};
  for (const item of items) counts[item.type] = (counts[item.type] || 0) + 1;
  return {
    slug,
    startTurn: startIndex + 1,
    endTurn: endIndex,
    totalEvents: items.length,
    counts,
    toolCalls: items.filter((item) => item.type === 'tool_call').length,
    gongcaoRoutes: items.filter((item) => item.type === 'gongcao_route').length,
    gongcaoDispatches: items.filter((item) => item.type === 'gongcao_dispatch').length,
    luohanReceipts: items.filter((item) => item.type === 'luohan_receipt').length,
    providerFallbacks: items.filter((item) => item.type === 'provider_fallback').length,
    contractErrors: items.filter((item) => item.type === 'agent_contract_error').length,
    backgroundIdle: items.filter((item) => item.type === 'background_idle').length,
    chartAssetDone: items.filter((item) => item.type === 'chart_asset_done').length,
    chartAssetErrors: items.filter((item) => item.type === 'chart_asset_error').map((item) => item.message),
    fuxiNodeDone: items.filter((item) => item.type === 'fuxi_node_done').length,
    fuxiNodeError: items.filter((item) => item.type === 'fuxi_node_error').length,
    configErrors: items.filter((item) => item.type === 'config_error').map((item) => item.message),
  };
}
