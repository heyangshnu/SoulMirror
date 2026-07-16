import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const issues = [];

const requiredFiles = [
  'AGENTS.md',
  'Dockerfile',
  'docker-compose.yml',
  '.dockerignore',
  '.env.example',
  'scripts/container-entrypoint.sh',
  'package.json',
  'host/src/server.ts',
  'host/src/claude-code-runner.ts',
  'mcp/src/chart-core.ts',
  'mcp/src/memory-server.ts',
  'mcp/src/methodology-server.ts',
  'web/index.html',
  'docs/ARCHITECTURE.md',
  'docs/MEMORY_MODEL.md',
  'docs/FUXI_ENGINE.md',
  'docs/BASIC_MEMORY_SYSTEM.md',
  'docs/CLAUDE_CODE_AGENTS.md',
  'docs/GONGCAO_ROUTING.md',
  'docs/LUOHAN_MEMORY_RULES.md',
  'docs/CHART_ASSET_L0.md',
  'docs/RUNTIME_AUDIT.md',
  'agents/bodhisattva.md',
  'agents/gongcao.md',
  'agents/luohan-wish.md',
  'agents/luohan-environment.md',
  'agents/luohan-relation.md',
  'agents/luohan-force.md',
  'agents/fuxi.md',
  'tests/fixtures/tesla-realistic-user-turns.zh.mjs',
];

const forbiddenPaths = [
  'db',
  '.opencode',
  'opencode',
  'opencode.jsonc',
  'opencode.jsonc.sample',
  'host/src/opencode-session-adapter.ts',
  'mcp/src/db-server.ts',
  'mcp/src/runtime-server.ts',
];

const initNodes = [
  ['A01', 'fuxi-nodes/A_单人基础报告/01_本命总解_prompt.md'],
  ['A02', 'fuxi-nodes/A_单人基础报告/02_八字气候报告_prompt.md'],
  ['A03', 'fuxi-nodes/A_单人基础报告/03_紫微生命地图_prompt.md'],
  ['A04', 'fuxi-nodes/A_单人基础报告/04_一生命势报告_prompt.md'],
  ['A05', 'fuxi-nodes/A_单人基础报告/05_命盘机制卡报告_prompt.md'],
  ['B06', 'fuxi-nodes/B_时间报告/06_全生命周期大运大限报告_prompt.md'],
  ['B07', 'fuxi-nodes/B_时间报告/07_当前十年深解_{当前年龄或指定大限}.md'],
  ['B10', 'fuxi-nodes/B_时间报告/10_当前流年报告_{目标年份}.md'],
  ['C13', 'fuxi-nodes/C_人生方面报告/13_事业成事报告_prompt.md'],
  ['C16', 'fuxi-nodes/C_人生方面报告/16_财富资源报告_prompt.md'],
  ['C18', 'fuxi-nodes/C_人生方面报告/18_合作团队报告_prompt.md'],
  ['C19', 'fuxi-nodes/C_人生方面报告/19_学习认知报告_prompt.md'],
  ['C20', 'fuxi-nodes/C_人生方面报告/20_表达内容报告_prompt.md'],
  ['C24', 'fuxi-nodes/C_人生方面报告/24_健康精力报告_prompt.md'],
  ['C25', 'fuxi-nodes/C_人生方面报告/25_福德内在报告_prompt.md'],
  ['D28', 'fuxi-nodes/D_关系报告/28_亲密关系报告_prompt.md'],
];

for (const rel of requiredFiles) if (!exists(rel)) issues.push(`missing required file: ${rel}`);
for (const rel of forbiddenPaths) if (exists(rel)) issues.push(`forbidden old artifact exists: ${rel}`);
for (const [code, rel] of initNodes) if (!exists(rel)) issues.push(`missing init node ${code}: ${rel}`);
if (!exists('fuxi-nodes/B_时间报告/09_全生命周期流年报告_prompt.md')) issues.push('B09 on-demand prompt must exist but not initialize');

const packageJson = JSON.parse(read('package.json'));
if (packageJson.dependencies?.pg || packageJson.devDependencies?.['@types/pg']) issues.push('PostgreSQL dependency remains');
if (JSON.stringify(packageJson.scripts ?? {}).includes('opencode')) issues.push('package scripts still mention OpenCode');
if (!packageJson.scripts?.['mcp:memory'] || !packageJson.scripts?.['mcp:methodology']) issues.push('MCP scripts missing');

const dockerfile = read('Dockerfile');
mustInclude(dockerfile, ['@anthropic-ai/claude-code@1.0.128', 'basic-memory==0.22.0', 'CLAUDE_CODE_BIN=claude', 'tini'], 'Dockerfile');

const entrypoint = read('scripts/container-entrypoint.sh');
if (entrypoint.includes('opencode')) issues.push('entrypoint still creates OpenCode runtime path');
mustInclude(entrypoint, ['claude-code', 'ulimit -c 0'], 'container-entrypoint');

const compose = read('docker-compose.yml');
mustInclude(compose, [
  'FUXI_INIT_CONCURRENCY: ${FUXI_INIT_CONCURRENCY:-5}',
  'CLAUDE_MODEL_BODHISATTVA: ${CLAUDE_MODEL_BODHISATTVA:-MiniMax-M3}',
  'CLAUDE_MODEL_GONGCAO: ${CLAUDE_MODEL_GONGCAO:-MiniMax-M3}',
  'CLAUDE_MODEL_LUOHAN: ${CLAUDE_MODEL_LUOHAN:-MiniMax-M3}',
  'CLAUDE_MODEL_FUXI: ${CLAUDE_MODEL_FUXI:-deepseek-v4-pro}',
  'CLAUDE_FALLBACK_MODEL: ${CLAUDE_FALLBACK_MODEL:-ark-code-latest}',
  'MINIMAX_ANTHROPIC_BASE_URL: ${MINIMAX_ANTHROPIC_BASE_URL:-https://api.minimaxi.com/anthropic}',
  'ARK_ANTHROPIC_BASE_URL: ${ARK_ANTHROPIC_BASE_URL:-https://ark.cn-beijing.volces.com/api/plan}',
], 'docker-compose.yml');
const hasComposeIdentity =
  (compose.includes('container_name: fate-and-fortune') && compose.includes('image: fate-and-fortune:local')) ||
  (compose.includes('container_name: soulmirror-agent') && compose.includes('image: soulmirror-agent:local'));
if (!hasComposeIdentity) {
  issues.push('docker-compose.yml missing container/image identity (fate-and-fortune or soulmirror-agent)');
}
if (/platform:\s*linux\/amd64/u.test(compose)) issues.push('compose must not force amd64 by default');

const runner = read('host/src/claude-code-runner.ts');
mustInclude(runner, [
  '--output-format',
  'stream-json',
  '--mcp-config',
  '--strict-mcp-config',
  '--disallowedTools',
  'sessionMode',
  'CLAUDE_CODE_USE_BARE',
  '--resume',
  'session-handles.json',
  'ANTHROPIC_API_KEY: input.provider.apiKey',
  'ANTHROPIC_BASE_URL: input.provider.baseUrl',
], 'claude-code-runner.ts');
if (runner.includes('opencode')) issues.push('runner still mentions OpenCode');
if (runner.includes('args.push(input.message)')) issues.push('runner must pass prompts via stdin');

const server = read('host/src/server.ts');
mustInclude(server, [
  "process.env.FUXI_INIT_CONCURRENCY || 5",
  'gongcaoInbox',
  'drainGongcao',
  'dispatchLuohanDeliveries',
  'drainLuohan',
  'drainFuxiQueue',
  "sessionKey: 'bodhisattva'",
  "sessionKey: 'gongcao'",
  "sessionKey: agent",
  "sessionMode: 'persistent'",
  "sessionMode: 'stateless'",
  'MiniMax-M3',
  'ark-code-latest',
  'provider_fallback',
  'deepseek-v4-pro',
  'buildGongcaoBatchPrompt',
  'buildLuohanBatchPrompt',
  'gongcao_dispatch',
  'luohan_batch_result',
  'background_idle',
  'default to LOG_ONLY',
  'not as same-turn dispatch permission',
  'L0_排盘事实档案.md',
  'L0_模型事实上下文.md',
  'Fuxi maintains 01_命 L0-L3',
  'validateFuxiNodeOutput',
  'Fuxi report does not reference chart_asset_id',
], 'server.ts');
if (server.includes('buildGongcaoPrompt(') || server.includes('dispatchLuohanTasks(')) issues.push('server still uses synchronous old post-turn flow');
if (server.includes('B_时间报告/09_')) issues.push('server must not initialize B09 path');
for (const [, rel] of initNodes) {
  const relWithoutPrefix = rel.replace(/^fuxi-nodes\//u, '');
  if (!server.includes(relWithoutPrefix)) issues.push(`server init list missing ${relWithoutPrefix}`);
}
for (const term of ['person_records', 'ActiveField', 'verification_queue', 'agent_write_batches', 'mcp:db', 'mcp:runtime']) {
  if (server.includes(term)) issues.push(`server contains old architecture term: ${term}`);
}

const memoryServer = read('mcp/src/memory-server.ts');
mustInclude(memoryServer, ['memory.write_gongcao', 'memory.write_fuxi', 'memory.write_luohan_wish', 'role-scoped memory writes must target Markdown or JSONL files'], 'memory-server.ts');

const bodhisattva = read('agents/bodhisattva.md');
mustInclude(bodhisattva, ['不直接创建或更新长期记忆', '<user_visible>', '<writeback_candidate>', '不得使用 Claude Code built-in `Read`、`Glob`、`Grep`', '读到足够理解为止'], 'bodhisattva.md');

const gongcao = read('agents/gongcao.md');
mustInclude(gongcao, ['轻判断、轻投递、记通讯', '<gongcao_dispatch>', 'dispatches', 'multicast', 'routing-memory.md', '这批材料可能与你有关，请按你的领域理解自行处理', '默认输出 `LOG_ONLY`', '不在同一轮根据 `luohan_note`'], 'gongcao.md');

for (const [file, folder] of [
  ['agents/luohan-wish.md', '02_愿'],
  ['agents/luohan-environment.md', '03_境'],
  ['agents/luohan-relation.md', '04_缘'],
  ['agents/luohan-force.md', '05_力'],
]) {
  const body = read(file);
  mustInclude(body, [`只维护 \`${folder}/\``, '领域话题网', '_network/index.md', '<luohan_batch_result>', 'luohan_note'], file);
}

const fuxi = read('agents/fuxi.md');
mustInclude(fuxi, ['L0：排盘事实', 'L1：终身底色', 'L2：大运/大限', 'L3：流年', '禁止初始化', '<fuxi_result>'], 'fuxi.md');

const web = read('web/index.html');
mustInclude(web, ['/ws?slug=', '事件流', 'Basic Memory Project', 'fuxiProgress'], 'web/index.html');

const fixture = read('tests/fixtures/tesla-realistic-user-turns.zh.mjs');
const fixtureTurnCount = [...fixture.matchAll(/'[^']+'/g)].length;
if (fixtureTurnCount !== 100) issues.push(`Tesla realistic fixture must contain 100 quoted turns, got ${fixtureTurnCount}`);
for (const forbidden of ['愿境缘力', 'Agent', 'MCP', 'Basic Memory', 'L0', 'L1', 'L2', 'L3']) {
  if (fixture.includes(forbidden)) issues.push(`Tesla fixture contains internal/test language: ${forbidden}`);
}

if (issues.length > 0) {
  console.error('Static validation failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('Static validation passed.');
console.log(`Checked ${requiredFiles.length} files, Claude Code queues, provider profiles, and ${initNodes.length} Fuxi init nodes.`);

function mustInclude(body, markers, label) {
  for (const marker of markers) {
    if (!body.includes(marker)) issues.push(`${label} missing marker: ${marker}`);
  }
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
