import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  buildMemoryDashboard,
  buildDomainDetail,
  confirmMemoryNote,
  listMingReports,
  listPendingNotes,
  listRecentActivity,
  listTopics,
  pickCurrentTopic,
  readCrossAxisEvent,
  readProjectFile,
  readTopicDetail,
  writeProjectFile,
} from './memory-http.js';
import { runMemoryMaintenance } from './maintenance.js';
import { UserVisibleStreamFilter } from './user-visible-stream.js';
import { readLatestTranscript } from './transcript-http.js';
import { ClaudeCodeRunner, type BasicMemoryRuntimeEnv, type ClaudeCodeProviderProfile } from './claude-code-runner.js';
import {
  createChartAsset,
  renderChartAssetContextMarkdown,
  renderChartAssetMarkdown,
  type ChartAsset,
} from '../../mcp/src/chart-core.js';

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '0.0.0.0';
const projectRoot = path.resolve(process.env.FATE_AND_FORTUNE_ROOT || process.cwd());
const runtimeRoot = path.resolve(process.env.RUNTIME_ROOT || path.join(projectRoot, 'runtime_spool'));
const memoryRoot = path.resolve(process.env.MEMORY_ROOT || path.join(runtimeRoot, 'memory-projects'));
const webIndexPath = path.join(projectRoot, 'web', 'index.html');
const basicMemoryBin = process.env.BASIC_MEMORY_BIN || 'basic-memory';
const fuxiInitConcurrency = Math.max(1, Number(process.env.FUXI_INIT_CONCURRENCY || 5));
const runner = new ClaudeCodeRunner();
const eventWriteQueues = new Map<string, Promise<void>>();

const memoryDirs = [
  '00_soul',
  '01_命',
  '02_愿',
  '03_境',
  '04_缘',
  '05_力',
  '06_功曹',
  '07_上下文包',
  '08_归档',
] as const;

const fuxiInitNodes = [
  ['A01', 'A_单人基础报告/01_本命总解_prompt.md', '本命总解'],
  ['A02', 'A_单人基础报告/02_八字气候报告_prompt.md', '八字气候报告'],
  ['A03', 'A_单人基础报告/03_紫微生命地图_prompt.md', '紫微生命地图'],
  ['A04', 'A_单人基础报告/04_一生命势报告_prompt.md', '一生命势报告'],
  ['A05', 'A_单人基础报告/05_命盘机制卡报告_prompt.md', '命盘机制卡报告'],
  ['B06', 'B_时间报告/06_全生命周期大运大限报告_prompt.md', '全生命周期大运大限报告'],
  ['B07', 'B_时间报告/07_当前十年深解_{当前年龄或指定大限}.md', '当前十年深解'],
  ['B10', 'B_时间报告/10_当前流年报告_{目标年份}.md', '当前流年报告'],
  ['C13', 'C_人生方面报告/13_事业成事报告_prompt.md', '事业成事报告'],
  ['C16', 'C_人生方面报告/16_财富资源报告_prompt.md', '财富资源报告'],
  ['C18', 'C_人生方面报告/18_合作团队报告_prompt.md', '合作团队报告'],
  ['C19', 'C_人生方面报告/19_学习认知报告_prompt.md', '学习认知报告'],
  ['C20', 'C_人生方面报告/20_表达内容报告_prompt.md', '表达内容报告'],
  ['C24', 'C_人生方面报告/24_健康精力报告_prompt.md', '健康精力报告'],
  ['C25', 'C_人生方面报告/25_福德内在报告_prompt.md', '福德内在报告'],
  ['D28', 'D_关系报告/28_亲密关系报告_prompt.md', '亲密关系报告'],
] as const;

const FUXI_CORE_CODES = new Set(['A01', 'A02', 'A03', 'A04', 'A05']);
type FuxiInitNode = (typeof fuxiInitNodes)[number];

function fuxiInitGate(): 'core' | 'full' {
  const raw = process.env.FUXI_INIT_GATE?.trim().toLowerCase();
  return raw === 'full' ? 'full' : 'core';
}

function countFuxiFailures(results: Array<WorkerResult<{ ok: boolean }>>): number {
  return results.filter((item) => item.status === 'rejected' || (item.status === 'fulfilled' && !item.value.ok)).length;
}

function countFuxiSkipped(results: Array<WorkerResult<{ ok: boolean }>>): number {
  return results.filter((item) => item.status === 'skipped').length;
}

type AgentName =
  | 'bodhisattva'
  | 'gongcao'
  | 'luohan-wish'
  | 'luohan-environment'
  | 'luohan-relation'
  | 'luohan-force'
  | 'fuxi';

interface RuntimeContext {
  slug: string;
  runId: string;
  runRoot: string;
  projectPath: string;
  basicMemory: BasicMemoryRuntimeEnv;
}

interface SocketState extends RuntimeContext {
  activeRuns: Set<() => void>;
  closed: boolean;
  messageQueue: Promise<void>;
  background: BackgroundQueues;
}

interface BackgroundQueues {
  gongcaoInbox: GongcaoInboxItem[];
  gongcaoRunning: boolean;
  luohanQueues: Record<LuohanAgentName, LuohanEnvelope[]>;
  luohanRunning: Record<LuohanAgentName, boolean>;
  fuxiQueue: QueuedFuxiTask[];
  fuxiActive: number;
}

type LuohanAgentName =
  | 'luohan-wish'
  | 'luohan-environment'
  | 'luohan-relation'
  | 'luohan-force';

interface TurnEnvelope {
  turn_id: string;
  time: string;
  user_text: string;
  bodhisattva_reply: string;
}

interface PostTurnPacket {
  kind: 'post_turn_packet';
  packet_id: string;
  turn_id: string;
  time: string;
  scene: string;
  user_text: string;
  bodhisattva_reply: string;
  writeback_candidate: string;
}

interface AgentReceiptPacket {
  kind: 'agent_receipt';
  receipt_id: string;
  from_agent: AgentName;
  time: string;
  receipt: unknown;
}

type GongcaoInboxItem = PostTurnPacket | AgentReceiptPacket;

interface LuohanEnvelope {
  task_id: string;
  batch_id: string;
  source: 'gongcao';
  scene: string;
  turns: TurnEnvelope[];
  delivery_note: string;
}

interface QueuedFuxiTask extends FuxiNodeTask {
  taskId: string;
}

interface AgentResult {
  ok: boolean;
  rawText: string;
  visibleText: string;
  durationMs: number;
  toolCalls?: string[];
  error?: string;
  streamedVisible?: boolean;
}

interface RouteDecision {
  type?: string;
  dispatches?: Array<{ agents?: string[]; agent?: string; scene?: string; turns?: TurnEnvelope[]; delivery_note?: string; task?: string; reason?: string }>;
  luohanTasks?: Array<{ agent?: string; agents?: string[]; task?: string; reason?: string; scene?: string; delivery_note?: string }>;
  fuxiTasks?: Array<{ nodeCode?: string; nodePath?: string; reason?: string; task?: string }>;
  [key: string]: unknown;
}

type WorkerResult<R> = PromiseSettledResult<R> | { status: 'skipped'; reason: string };

interface ChartAssetRef {
  chartAssetId: string;
  jsonPath: string;
  markdownPath: string;
  contextPath: string;
  l0Path: string;
  l0ContextPath: string;
}

interface FuxiNodeTask {
  code: string;
  relPath: string;
  name: string;
  triggerLevel: string;
  triggerReason: string;
  birthProfile: unknown;
  chartAsset?: ChartAssetRef;
  userText?: string;
  turnId: string;
}

interface FuxiResultPayload {
  status?: string;
  nodeCode?: string;
  wroteTo?: string;
  triggeredB09?: boolean;
  needsLuohan?: boolean;
  notes?: string;
}

await ensureRuntimeRoots();

const server = createServer(async (req, res) => {
  try {
    await handleHttp(req, res);
  } catch (error) {
    writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req, socket, head) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    const slug = normalizeSlug(url.searchParams.get('slug') || '');
    // Defer Basic Memory CLI registration so WS handshake is fast (chat can start immediately).
    const context = await createRuntimeContext(slug, { deferBasicMemory: true });
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, context);
    });
  } catch {
    socket.destroy();
  }
});

wss.on('connection', (socket: WebSocket, _req: IncomingMessage, context: RuntimeContext) => {
  const state: SocketState = {
    ...context,
    activeRuns: new Set(),
    closed: false,
    messageQueue: Promise.resolve(),
    background: createBackgroundQueues(),
  };
  emit(state, socket, {
    type: 'connected',
    slug: state.slug,
    runId: state.runId,
    memoryProjectPath: state.projectPath,
  });

  socket.on('close', () => {
    state.closed = true;
    for (const stop of state.activeRuns) stop();
    state.activeRuns.clear();
  });

  socket.on('message', (raw) => {
    state.messageQueue = state.messageQueue
      .then(async () => {
        if (state.closed) return;
        try {
          const input = JSON.parse(String(raw)) as Record<string, unknown>;
          if (input.type === 'start') {
            await handleStart(state, socket, input);
            return;
          }
          if (input.type === 'message') {
            await handleMessage(state, socket, input);
            return;
          }
          emit(state, socket, { type: 'error', message: `Unsupported message type: ${String(input.type)}` });
        } catch (error) {
          emit(state, socket, { type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
      })
      .catch((error) => {
        emit(state, socket, { type: 'error', message: error instanceof Error ? error.message : String(error) });
      });
  });
});

server.listen(port, host, () => {
  process.stdout.write(`@soulmirror/agent-host listening on http://${host}:${port}\n`);
  const maintenanceHours = Number(process.env.MEMORY_MAINTENANCE_INTERVAL_HOURS || '24');
  if (maintenanceHours > 0) {
    setInterval(async () => {
      try {
        const { readdir } = await import('node:fs/promises');
        const slugs = await readdir(memoryRoot).catch(() => [] as string[]);
        for (const slug of slugs) {
          if (slug.startsWith('.')) continue;
          const projectPath = path.join(memoryRoot, slug);
          await runMemoryMaintenance(projectPath);
        }
      } catch {
        /* best-effort */
      }
    }, maintenanceHours * 60 * 60 * 1000);
  }
});

function createBackgroundQueues(): BackgroundQueues {
  return {
    gongcaoInbox: [],
    gongcaoRunning: false,
    luohanQueues: {
      'luohan-wish': [],
      'luohan-environment': [],
      'luohan-relation': [],
      'luohan-force': [],
    },
    luohanRunning: {
      'luohan-wish': false,
      'luohan-environment': false,
      'luohan-relation': false,
      'luohan-force': false,
    },
    fuxiQueue: [],
    fuxiActive: 0,
  };
}

async function handleHttp(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  if (url.pathname === '/health') {
    writeJson(res, 200, { ok: true, service: '@soulmirror/agent-host', runtimeRoot, memoryRoot });
    return;
  }

  const statusMatch = url.pathname.match(/^\/api\/([^/]+)\/status$/u);
  if (statusMatch) {
    const slug = normalizeSlug(decodeURIComponent(statusMatch[1]));
    const context = await createProjectContext(slug, 'status');
    writeJson(res, 200, { ok: true, ...(await readProjectStatus(context)) });
    return;
  }

  const apiSlugMatch = url.pathname.match(/^\/api\/([^/]+)\/(dashboard|pending|topics|ming-reports|file|transcript|current-topic|recent-activity|events)$/u);
  if (apiSlugMatch && req.method === 'GET') {
    try {
      const slug = normalizeSlug(decodeURIComponent(apiSlugMatch[1]));
      const context = await createProjectContext(slug, 'memory-api');
      const action = apiSlugMatch[2];
      if (action === 'dashboard') {
        const dashboard = await buildMemoryDashboard(context.projectPath);
        const currentTopic = await pickCurrentTopic(context.projectPath);
        writeJson(res, 200, { ok: true, dashboard, currentTopic });
        return;
      }
      if (action === 'current-topic') {
        writeJson(res, 200, { ok: true, topic: await pickCurrentTopic(context.projectPath) });
        return;
      }
      if (action === 'recent-activity') {
        const limit = Number(url.searchParams.get('limit') || '8');
        writeJson(res, 200, { ok: true, items: await listRecentActivity(context.projectPath, limit) });
        return;
      }
      if (action === 'events') {
        const eventId = url.searchParams.get('id') || '';
        if (!eventId) {
          writeJson(res, 400, { ok: false, error: 'id required' });
          return;
        }
        writeJson(res, 200, { ok: true, event: await readCrossAxisEvent(context.projectPath, eventId) });
        return;
      }
      if (action === 'pending') {
        writeJson(res, 200, { ok: true, items: await listPendingNotes(context.projectPath) });
        return;
      }
      if (action === 'topics') {
        const status = url.searchParams.get('status') || undefined;
        writeJson(res, 200, { ok: true, topics: await listTopics(context.projectPath, status ?? undefined) });
        return;
      }
      if (action === 'ming-reports') {
        writeJson(res, 200, { ok: true, reports: await listMingReports(context.projectPath) });
        return;
      }
      if (action === 'file') {
        const rel = url.searchParams.get('rel');
        if (!rel) {
          writeJson(res, 400, { ok: false, error: 'rel required' });
          return;
        }
        const file = await readProjectFile(context.projectPath, rel);
        writeJson(res, 200, { ok: true, rel, ...file });
        return;
      }
      if (action === 'transcript') {
        const limit = Number(url.searchParams.get('limit') || '50');
        const transcript = await readLatestTranscript(runtimeRoot, slug, limit);
        writeJson(res, 200, transcript);
        return;
      }
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }
  }

  const topicDetailMatch = url.pathname.match(/^\/api\/([^/]+)\/topics\/([^/]+)$/u);
  if (topicDetailMatch && req.method === 'GET') {
    try {
      const slug = normalizeSlug(decodeURIComponent(topicDetailMatch[1]));
      const noteId = decodeURIComponent(topicDetailMatch[2]);
      const context = await createProjectContext(slug, 'topic-detail');
      const rel = noteId.replace(/__/g, '/');
      writeJson(res, 200, { ok: true, topic: await readTopicDetail(context.projectPath, rel) });
      return;
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }
  }

  const domainMatch = url.pathname.match(/^\/api\/([^/]+)\/domain\/([^/]+)$/u);
  if (domainMatch && req.method === 'GET') {
    try {
      const slug = normalizeSlug(decodeURIComponent(domainMatch[1]));
      const domain = decodeURIComponent(domainMatch[2]);
      const context = await createProjectContext(slug, 'domain-detail');
      const detail = await buildDomainDetail(context.projectPath, domain);
      if (!detail) {
        writeJson(res, 404, { ok: false, error: 'domain not found' });
        return;
      }
      writeJson(res, 200, { ok: true, domain: detail });
      return;
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }
  }

  const maintenanceMatch = url.pathname.match(/^\/api\/([^/]+)\/maintenance$/u);
  if (maintenanceMatch && req.method === 'POST') {
    try {
      const slug = normalizeSlug(decodeURIComponent(maintenanceMatch[1]));
      const context = await createProjectContext(slug, 'maintenance');
      writeJson(res, 200, { ok: true, ...(await runMemoryMaintenance(context.projectPath)) });
      return;
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }
  }

  const notesMatch = url.pathname.match(/^\/api\/([^/]+)\/notes$/u);
  if (notesMatch && req.method === 'POST') {
    const writeKey = process.env.MEMORY_WRITE_SECRET || '';
    const headerKey = req.headers['x-memory-write-key'];
    if (!writeKey || headerKey !== writeKey) {
      writeJson(res, 403, { ok: false, error: 'forbidden' });
      return;
    }
    try {
      const slug = normalizeSlug(decodeURIComponent(notesMatch[1]));
      const context = await createProjectContext(slug, 'write-note');
      const body = await readJsonBody(req);
      const rel = typeof body.rel === 'string' ? body.rel : '';
      const content = typeof body.content === 'string' ? body.content : '';
      if (!rel || !content) {
        writeJson(res, 400, { ok: false, error: 'rel and content required' });
        return;
      }
      writeJson(res, 200, await writeProjectFile(context.projectPath, rel, content));
      return;
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }
  }

  const fuxiRunMatch = url.pathname.match(/^\/api\/([^/]+)\/fuxi-run$/u);
  if (fuxiRunMatch && req.method === 'POST') {
    try {
      const slug = normalizeSlug(decodeURIComponent(fuxiRunMatch[1]));
      const body = await readJsonBody(req);
      const codesRaw = Array.isArray(body.codes) ? body.codes : typeof body.code === 'string' ? [body.code] : [];
      const codes = codesRaw.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim().toUpperCase());
      if (!codes.length) {
        writeJson(res, 400, { ok: false, error: 'codes required (e.g. ["B07","C13"])' });
        return;
      }
      const result = await runLazyFuxiNodes(slug, codes);
      writeJson(res, 200, result);
      return;
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }
  }

  const confirmMatch = url.pathname.match(/^\/api\/([^/]+)\/memory\/confirm$/u);
  if (confirmMatch && req.method === 'POST') {
    try {
      const slug = normalizeSlug(decodeURIComponent(confirmMatch[1]));
      const context = await createProjectContext(slug, 'memory-confirm');
      const body = await readJsonBody(req);
      const rel = typeof body.rel === 'string' ? body.rel : '';
      const action = body.action === 'reject' ? 'reject' : 'confirm';
      if (!rel) {
        writeJson(res, 400, { ok: false, error: 'rel required' });
        return;
      }
      writeJson(res, 200, await confirmMemoryNote(context.projectPath, rel, action));
      return;
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }
  }

  if (req.method === 'GET' && (url.pathname === '/' || isSlugPath(url.pathname))) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    createReadStream(webIndexPath).pipe(res);
    return;
  }

  writeJson(res, 404, { ok: false, error: 'not found' });
}

async function handleStart(state: SocketState, socket: WebSocket, input: Record<string, unknown>) {
  const birthProfile = {
    gender: input.gender,
    birthDateTime: input.birthDateTime,
    timezone: input.timezone || 'Asia/Shanghai',
    birthPlace: input.birthPlace || null,
    accuracy: input.accuracy || { time: 'exact', place: 'missing' },
  };
  const turnId = randomUUID();
  await appendTurn(state, { turnId, type: 'birth_intake', birthProfile });
  await appendTranscript(state, `\n\n## Birth Intake ${new Date().toISOString()}\n\n\`\`\`json\n${JSON.stringify(birthProfile, null, 2)}\n\`\`\`\n`);
  emit(state, socket, { type: 'birth_intake_received', birthProfile });

  const chartAsset = await ensureFuxiChartAsset(state, socket, birthProfile, turnId);
  if (!chartAsset) {
    emit(state, socket, {
      type: 'fuxi_init_failed',
      total: fuxiInitNodes.length,
      failed: fuxiInitNodes.length,
      skipped: fuxiInitNodes.length,
      message: 'Fuxi initialization is blocked because L0 chart asset generation failed.',
    });
    return;
  }

  const gate = fuxiInitGate();
  emit(state, socket, {
    type: 'fuxi_init_started',
    total: gate === 'full' ? fuxiInitNodes.length : FUXI_CORE_CODES.size,
    concurrency: fuxiInitConcurrency,
    chartAssetId: chartAsset.chartAssetId,
    gate,
  });

  if (gate === 'full') {
    await runFullFuxiInit(state, socket, birthProfile, chartAsset, turnId);
    return;
  }

  const coreNodes = fuxiInitNodes.filter(([code]) => FUXI_CORE_CODES.has(code));
  const extendedNodes = fuxiInitNodes.filter(([code]) => !FUXI_CORE_CODES.has(code));
  const coreResults = await runFuxiInitBatch(state, socket, coreNodes, birthProfile, chartAsset, turnId);
  const coreFailed = countFuxiFailures(coreResults);
  const coreSkipped = countFuxiSkipped(coreResults);
  if (state.closed) return;

  if (coreSkipped > 0) {
    emit(state, socket, {
      type: 'fuxi_init_aborted',
      total: fuxiInitNodes.length,
      failed: coreFailed,
      skipped: coreSkipped,
      reason: 'fatal_provider_or_configuration_error',
    });
  }

  if (coreFailed > 0 || coreSkipped > 0) {
    emit(state, socket, { type: 'fuxi_init_done', total: fuxiInitNodes.length, failed: coreFailed, skipped: coreSkipped, gate });
    emit(state, socket, {
      type: 'fuxi_init_failed',
      total: fuxiInitNodes.length,
      failed: coreFailed,
      skipped: coreSkipped,
      message: `Core Fuxi initialization failed for ${coreFailed}/${coreNodes.length} nodes. Chat remains available; deep reports are incomplete.`,
    });
    return;
  }

  emit(state, socket, {
    type: 'fuxi_init_chat_ready',
    coreDone: coreNodes.length,
    total: coreNodes.length,
    gate,
    lazyRemaining: extendedNodes.map(([code]) => code),
  });
  await runBodhisattvaOpening(state, socket, birthProfile, 0);
  // Lazy mode: do NOT auto-run B/C/D nodes. They start via POST /api/:slug/fuxi-run or Gongcao TRIGGER_FUXI.
  emit(state, socket, {
    type: 'fuxi_init_done',
    total: coreNodes.length,
    failed: 0,
    skipped: 0,
    gate: 'core',
    lazyRemaining: extendedNodes.map(([code]) => code),
  });
}

async function runFullFuxiInit(
  state: SocketState,
  socket: WebSocket,
  birthProfile: Record<string, unknown>,
  chartAsset: NonNullable<Awaited<ReturnType<typeof ensureFuxiChartAsset>>>,
  turnId: string,
) {
  const results = await runFuxiInitBatch(state, socket, fuxiInitNodes, birthProfile, chartAsset, turnId);
  const failed = countFuxiFailures(results);
  const skipped = countFuxiSkipped(results);
  if (state.closed) return;
  if (skipped > 0) {
    emit(state, socket, {
      type: 'fuxi_init_aborted',
      total: fuxiInitNodes.length,
      failed,
      skipped,
      reason: 'fatal_provider_or_configuration_error',
    });
  }
  emit(state, socket, { type: 'fuxi_init_done', total: fuxiInitNodes.length, failed, skipped, gate: 'full' });
  if (failed > 0 || skipped > 0) {
    emit(state, socket, {
      type: 'fuxi_init_failed',
      total: fuxiInitNodes.length,
      failed,
      skipped,
      message: `Fuxi initialization failed for ${failed}/${fuxiInitNodes.length} nodes and skipped ${skipped}. Chat remains available; deep reports are incomplete.`,
    });
    return;
  }
  await runBodhisattvaOpening(state, socket, birthProfile, failed);
}

async function runExtendedFuxiInit(
  state: SocketState,
  socket: WebSocket,
  extendedNodes: readonly FuxiInitNode[],
  birthProfile: Record<string, unknown>,
  chartAsset: NonNullable<Awaited<ReturnType<typeof ensureFuxiChartAsset>>>,
  turnId: string,
) {
  try {
    if (extendedNodes.length === 0) {
      emit(state, socket, { type: 'fuxi_init_done', total: fuxiInitNodes.length, failed: 0, skipped: 0, gate: 'core' });
      return;
    }
    const results = await runFuxiInitBatch(state, socket, extendedNodes, birthProfile, chartAsset, turnId);
    const failed = countFuxiFailures(results);
    const skipped = countFuxiSkipped(results);
    if (state.closed) return;
    emit(state, socket, { type: 'fuxi_init_done', total: fuxiInitNodes.length, failed, skipped, gate: 'core' });
    if (failed > 0 || skipped > 0) {
      emit(state, socket, {
        type: 'fuxi_init_partial',
        total: fuxiInitNodes.length,
        failed,
        skipped,
        message: `Background initialization finished with ${failed} failed node(s). Chat remains available; retry from settings to fill gaps.`,
      });
    }
  } catch (error: unknown) {
    emit(state, socket, {
      type: 'fuxi_init_partial',
      total: fuxiInitNodes.length,
      failed: extendedNodes.length,
      skipped: 0,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** On-demand Fuxi nodes (B/C/D etc.) after core A01–A05 init. */
async function runLazyFuxiNodes(slug: string, codes: string[]) {
  const wanted = new Set(codes.map((c) => c.toUpperCase()));
  const nodes = fuxiInitNodes.filter(([code]) => wanted.has(code) && !FUXI_CORE_CODES.has(code));
  // Allow re-running core codes too if explicitly requested
  const coreRequested = fuxiInitNodes.filter(([code]) => wanted.has(code) && FUXI_CORE_CODES.has(code));
  const selected = [...nodes, ...coreRequested];
  if (!selected.length) {
    return {
      ok: false,
      error: `No matching Fuxi nodes for codes: ${codes.join(',')}`,
      available: fuxiInitNodes.map(([code]) => code),
    };
  }

  const context = await createRuntimeContext(slug);
  const state: SocketState = {
    ...context,
    activeRuns: new Set(),
    closed: false,
    messageQueue: Promise.resolve(),
    background: createBackgroundQueues(),
  };
  const socket = { readyState: 3, OPEN: 1, send() {} } as unknown as WebSocket;
  const chartAsset = await readLatestChartAssetRef(state.projectPath);
  if (!chartAsset) {
    return { ok: false, error: 'Missing L0 chart asset; complete birth intake first.' };
  }

  const turnId = randomUUID();
  const results: Array<{ code: string; ok: boolean; error?: string; reused?: boolean }> = [];
  for (const [code, relPath, name] of selected) {
    const result = await runFuxiNode(state, socket, {
      code,
      relPath,
      name,
      triggerLevel: 'lazy',
      triggerReason: 'user_or_api_lazy_load',
      birthProfile: null,
      chartAsset,
      turnId,
    });
    results.push({
      code,
      ok: result.ok,
      error: result.error,
      reused: /"reused":\s*true/.test(result.rawText || ''),
    });
  }

  return {
    ok: results.every((r) => r.ok),
    scheduled: results.length,
    results,
  };
}

async function runFuxiInitBatch(
  state: SocketState,
  socket: WebSocket,
  nodes: readonly FuxiInitNode[],
  birthProfile: Record<string, unknown>,
  chartAsset: NonNullable<Awaited<ReturnType<typeof ensureFuxiChartAsset>>>,
  turnId: string,
) {
  return runWithConcurrency(
    nodes,
    fuxiInitConcurrency,
    async ([code, relPath, name]) => (
      await runFuxiNode(state, socket, {
        code,
        relPath,
        name,
        triggerLevel: 'F0',
        triggerReason: 'new_person_initialization',
        birthProfile,
        chartAsset,
        turnId,
      })
    ),
    isFatalFuxiInitError,
    () => state.closed,
  );
}

async function runBodhisattvaOpening(
  state: SocketState,
  socket: WebSocket,
  birthProfile: Record<string, unknown>,
  failedFuxiNodes: number,
) {
  const prefetchContext = await loadBodhisattvaPrefetchContext(state.projectPath);
  const opening = await runAgent(state, socket, {
    agent: 'bodhisattva',
    role: 'bodhisattva',
    sessionKey: 'bodhisattva',
    sessionMode: 'persistent',
    message: buildOpeningPrompt(state.slug, birthProfile, failedFuxiNodes, prefetchContext),
    requiredToolPrefixes: undefined,
    forwardText: true,
  });
  if (!opening.ok) {
    emit(state, socket, { type: 'turn_failed', agent: 'bodhisattva', message: opening.error || 'Bodhisattva opening failed.' });
    return;
  }
  const visible = extractTag(opening.rawText, 'user_visible') || opening.rawText.trim();
  if (visible && !opening.streamedVisible) {
    emit(state, socket, { type: 'assistant_message', text: visible });
    await appendTranscript(state, `\n\n## 菩萨 ${new Date().toISOString()}\n\n${visible}\n`);
  } else if (visible) {
    await appendTranscript(state, `\n\n## 菩萨 ${new Date().toISOString()}\n\n${visible}\n`);
  }
}

async function handleMessage(state: SocketState, socket: WebSocket, input: Record<string, unknown>) {
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (!text) {
    emit(state, socket, { type: 'error', message: 'Empty message.' });
    return;
  }
  const turnId = randomUUID();
  await appendTurn(state, { turnId, type: 'user_message', text });
  await appendTranscript(state, `\n\n## 用户 ${new Date().toISOString()}\n\n${text}\n`);
  emit(state, socket, { type: 'turn_started', turnId });

  const prefetchContext = await loadBodhisattvaPrefetchContext(state.projectPath);
  const recentTranscript = await loadRecentTranscriptTail(state.runRoot);
  const bodhisattva = await runAgent(state, socket, {
    agent: 'bodhisattva',
    role: 'bodhisattva',
    sessionKey: 'bodhisattva',
    sessionMode: 'persistent',
    message: buildBodhisattvaPrompt(state.slug, turnId, text, prefetchContext, recentTranscript),
    // Do not force memory tools — early turns may have no notes yet.
    requiredToolPrefixes: undefined,
    forwardText: true,
  });
  if (!bodhisattva.ok) {
    emit(state, socket, { type: 'turn_failed', turnId, agent: 'bodhisattva', message: bodhisattva.error || 'Bodhisattva failed.' });
    return;
  }
  const visible = extractTag(bodhisattva.rawText, 'user_visible') || bodhisattva.rawText.trim();
  const writebackCandidate = extractTag(bodhisattva.rawText, 'writeback_candidate');
  if (visible && !bodhisattva.streamedVisible) {
    emit(state, socket, { type: 'assistant_message', turnId, text: visible });
  }
  if (visible) {
    await appendTranscript(state, `\n\n## 菩萨 ${new Date().toISOString()}\n\n${visible}\n`);
  }
  if (writebackCandidate) {
    emit(state, socket, { type: 'writeback_candidate', turnId, text: writebackCandidate });
  }

  const packet: PostTurnPacket = {
    kind: 'post_turn_packet',
    packet_id: randomUUID(),
    turn_id: turnId,
    time: new Date().toISOString(),
    scene: 'user_chat_turn',
    user_text: text,
    bodhisattva_reply: visible,
    writeback_candidate: writebackCandidate || '',
  };
  await appendJsonl(path.join(state.runRoot, 'post-turn-packets.jsonl'), { ...packet });
  emit(state, socket, { type: 'post_turn_packet', turnId, packet });
  enqueueGongcao(state, socket, packet);
  emit(state, socket, { type: 'turn_done', turnId });
}

function enqueueGongcao(state: SocketState, socket: WebSocket, item: GongcaoInboxItem) {
  state.background.gongcaoInbox.push(item);
  emit(state, socket, {
    type: 'gongcao_backlog',
    size: state.background.gongcaoInbox.length,
    itemKind: item.kind,
  });
  void drainGongcao(state, socket);
}

async function drainGongcao(state: SocketState, socket: WebSocket) {
  if (state.closed || state.background.gongcaoRunning) return;
  state.background.gongcaoRunning = true;
  try {
    while (!state.closed && state.background.gongcaoInbox.length > 0) {
      const batch = state.background.gongcaoInbox.splice(0);
      const batchId = randomUUID();
      await appendJsonl(path.join(state.runRoot, 'gongcao-batches.jsonl'), { batchId, batch });
      emit(state, socket, { type: 'gongcao_batch_started', batchId, size: batch.length });
      const result = await runAgent(state, socket, {
        agent: 'gongcao',
        role: 'gongcao',
        sessionKey: 'gongcao',
        sessionMode: 'persistent',
        message: buildGongcaoBatchPrompt(state.slug, batchId, batch),
        forwardText: false,
      });
      if (!result.ok) {
        emit(state, socket, { type: 'gongcao_error', batchId, message: result.error || 'Gongcao failed.' });
        continue;
      }
      const route = parseGongcaoRoute(result.rawText);
      if (!route) {
        emit(state, socket, { type: 'gongcao_route_error', batchId, message: 'Gongcao did not return a parseable <gongcao_dispatch> or <gongcao_route> JSON block.' });
        continue;
      }
      emit(state, socket, { type: 'gongcao_dispatch', batchId, route });
      await appendJsonl(path.join(state.runRoot, 'gongcao-dispatch.jsonl'), { batchId, route });
      dispatchLuohanDeliveries(state, socket, batchId, route, batch);
      await dispatchFuxiBackgroundTasks(state, socket, batchId, route, batch);
    }
  } finally {
    state.background.gongcaoRunning = false;
    maybeEmitBackgroundIdle(state, socket);
    if (!state.closed && state.background.gongcaoInbox.length > 0) void drainGongcao(state, socket);
  }
}

function dispatchLuohanDeliveries(
  state: SocketState,
  socket: WebSocket,
  batchId: string,
  route: RouteDecision,
  sourceBatch: GongcaoInboxItem[],
) {
  const deliveries = normalizeLuohanDeliveries(batchId, route, sourceBatch);
  for (const delivery of deliveries) {
    for (const agent of delivery.agents) {
      const envelope: LuohanEnvelope = {
        task_id: delivery.taskId,
        batch_id: batchId,
        source: 'gongcao',
        scene: delivery.scene,
        turns: delivery.turns,
        delivery_note: delivery.deliveryNote,
      };
      state.background.luohanQueues[agent].push(envelope);
      emit(state, socket, {
        type: 'luohan_inbox',
        agent,
        batchId,
        taskId: envelope.task_id,
        size: state.background.luohanQueues[agent].length,
      });
      void drainLuohan(state, socket, agent);
    }
  }
}

async function drainLuohan(state: SocketState, socket: WebSocket, agent: LuohanAgentName) {
  if (state.closed || state.background.luohanRunning[agent]) return;
  state.background.luohanRunning[agent] = true;
  try {
    while (!state.closed && state.background.luohanQueues[agent].length > 0) {
      const batch = state.background.luohanQueues[agent].splice(0);
      const batchId = randomUUID();
      await appendJsonl(path.join(state.runRoot, `${agent}-batches.jsonl`), { batchId, batch });
      emit(state, socket, { type: 'luohan_batch_started', agent, batchId, size: batch.length });
      const result = await runAgent(state, socket, {
        agent,
        role: 'luohan',
        sessionKey: agent,
        sessionMode: 'persistent',
        message: buildLuohanBatchPrompt(state.slug, batchId, agent, batch),
        forwardText: false,
      });
      const receiptText = extractTag(result.rawText, 'luohan_batch_result')
        || extractTag(result.rawText, 'luohan_result')
        || result.rawText.trim().slice(0, 4000);
      const receipt = parseJsonMaybe(receiptText) ?? { status: result.ok ? 'done' : 'error', luohan_note: receiptText };
      const receiptScopeError = validateLuohanReceiptScope(agent, receipt);
      if (receiptScopeError) {
        emit(state, socket, {
          type: 'agent_contract_error',
          agent,
          role: 'luohan',
          message: receiptScopeError,
        });
      }
      const receiptOk = result.ok && !receiptScopeError;
      emit(state, socket, {
        type: 'luohan_receipt',
        agent,
        batchId,
        ok: receiptOk,
        receipt,
        error: receiptScopeError || result.error,
      });
      await appendJsonl(path.join(state.runRoot, 'luohan-receipts.jsonl'), { agent, batchId, ok: receiptOk, receipt, error: receiptScopeError || result.error });
      enqueueGongcao(state, socket, {
        kind: 'agent_receipt',
        receipt_id: randomUUID(),
        from_agent: agent,
        time: new Date().toISOString(),
        receipt: receiptScopeError ? { status: 'contract_error', error: receiptScopeError, original_receipt: receipt } : receipt,
      });
    }
  } finally {
    state.background.luohanRunning[agent] = false;
    maybeEmitBackgroundIdle(state, socket);
    if (!state.closed && state.background.luohanQueues[agent].length > 0) void drainLuohan(state, socket, agent);
  }
}

async function dispatchFuxiBackgroundTasks(
  state: SocketState,
  socket: WebSocket,
  batchId: string,
  route: RouteDecision,
  sourceBatch: GongcaoInboxItem[],
) {
  const tasks = Array.isArray(route.fuxiTasks) ? route.fuxiTasks : [];
  if (tasks.length === 0) return;
  const chartAsset = await readLatestChartAssetRef(state.projectPath);
  const latestUserText = latestUserTextFromBatch(sourceBatch);
  for (const task of tasks) {
    if (!task.nodeCode || !task.nodePath) {
      emit(state, socket, { type: 'fuxi_route_skipped', batchId, reason: 'missing_nodeCode_or_nodePath', task });
      continue;
    }
    const queued: QueuedFuxiTask = {
      taskId: randomUUID(),
      code: task.nodeCode,
      relPath: task.nodePath,
      name: task.reason || task.nodeCode,
      triggerLevel: 'gongcao_route',
      triggerReason: task.reason || task.task || 'gongcao_triggered_fuxi',
      birthProfile: null,
      chartAsset: chartAsset ?? undefined,
      userText: latestUserText,
      turnId: latestTurnIdFromBatch(sourceBatch) || batchId,
    };
    state.background.fuxiQueue.push(queued);
    emit(state, socket, { type: 'fuxi_queued', batchId, taskId: queued.taskId, nodeCode: queued.code, queueSize: state.background.fuxiQueue.length });
  }
  drainFuxiQueue(state, socket);
}

function drainFuxiQueue(state: SocketState, socket: WebSocket) {
  if (state.closed) return;
  while (state.background.fuxiActive < fuxiInitConcurrency && state.background.fuxiQueue.length > 0) {
    const task = state.background.fuxiQueue.shift();
    if (!task) break;
    state.background.fuxiActive += 1;
    void (async () => {
      const result = await runFuxiNode(state, socket, task);
      emit(state, socket, {
        type: 'fuxi_receipt',
        taskId: task.taskId,
        nodeCode: task.code,
        ok: result.ok,
        error: result.error,
      });
      enqueueGongcao(state, socket, {
        kind: 'agent_receipt',
        receipt_id: randomUUID(),
        from_agent: 'fuxi',
        time: new Date().toISOString(),
        receipt: {
          status: result.ok ? 'done' : 'error',
          nodeCode: task.code,
          raw: extractTag(result.rawText, 'fuxi_result') || result.rawText.slice(0, 2000),
          error: result.error,
        },
      });
    })()
      .catch((error: unknown) => {
        emit(state, socket, { type: 'fuxi_node_error', nodeCode: task.code, error: error instanceof Error ? error.message : String(error) });
      })
      .finally(() => {
        state.background.fuxiActive -= 1;
        drainFuxiQueue(state, socket);
        maybeEmitBackgroundIdle(state, socket);
      });
  }
}

function maybeEmitBackgroundIdle(state: SocketState, socket: WebSocket) {
  const luohanBusy = Object.values(state.background.luohanRunning).some(Boolean)
    || Object.values(state.background.luohanQueues).some((queue) => queue.length > 0);
  const idle = !state.background.gongcaoRunning
    && state.background.gongcaoInbox.length === 0
    && !luohanBusy
    && state.background.fuxiActive === 0
    && state.background.fuxiQueue.length === 0;
  if (idle) emit(state, socket, { type: 'background_idle' });
}

function normalizeLuohanDeliveries(
  batchId: string,
  route: RouteDecision,
  sourceBatch: GongcaoInboxItem[],
): Array<{ taskId: string; agents: LuohanAgentName[]; scene: string; turns: TurnEnvelope[]; deliveryNote: string }> {
  const allowed = new Set<LuohanAgentName>(['luohan-wish', 'luohan-environment', 'luohan-relation', 'luohan-force']);
  const sourceTurns = turnsFromBatch(sourceBatch);
  const out: Array<{ taskId: string; agents: LuohanAgentName[]; scene: string; turns: TurnEnvelope[]; deliveryNote: string }> = [];
  const dispatches = Array.isArray(route.dispatches) ? route.dispatches : [];
  for (const dispatch of dispatches) {
    const agents = uniqueStrings([...(dispatch.agents ?? []), dispatch.agent ?? ''])
      .filter((agent): agent is LuohanAgentName => allowed.has(agent as LuohanAgentName));
    if (agents.length === 0) continue;
    out.push({
      taskId: randomUUID(),
      agents,
      scene: dispatch.scene || route.type || 'post_turn',
      turns: Array.isArray(dispatch.turns) && dispatch.turns.length > 0 ? dispatch.turns : sourceTurns,
      deliveryNote: dispatch.delivery_note || dispatch.task || dispatch.reason || '这批材料可能与你有关，请按你的领域理解自行处理。',
    });
  }
  const legacy = Array.isArray(route.luohanTasks) ? route.luohanTasks : [];
  for (const task of legacy) {
    const agents = uniqueStrings([...(task.agents ?? []), task.agent ?? ''])
      .filter((agent): agent is LuohanAgentName => allowed.has(agent as LuohanAgentName));
    if (agents.length === 0) continue;
    out.push({
      taskId: randomUUID(),
      agents,
      scene: task.scene || task.reason || route.type || 'post_turn',
      turns: sourceTurns,
      deliveryNote: task.delivery_note || task.task || '这批材料可能与你有关，请按你的领域理解自行处理。',
    });
  }
  return out;
}

function turnsFromBatch(batch: GongcaoInboxItem[]): TurnEnvelope[] {
  return batch
    .filter((item): item is PostTurnPacket => item.kind === 'post_turn_packet')
    .map((item) => ({
      turn_id: item.turn_id,
      time: item.time,
      user_text: item.user_text,
      bodhisattva_reply: item.bodhisattva_reply,
    }));
}

function latestUserTextFromBatch(batch: GongcaoInboxItem[]) {
  return [...batch].reverse().find((item): item is PostTurnPacket => item.kind === 'post_turn_packet')?.user_text;
}

function latestTurnIdFromBatch(batch: GongcaoInboxItem[]) {
  return [...batch].reverse().find((item): item is PostTurnPacket => item.kind === 'post_turn_packet')?.turn_id;
}

function validateLuohanReceiptScope(agent: LuohanAgentName, receipt: unknown) {
  if (!receipt || typeof receipt !== 'object') return undefined;
  const folderByAgent: Record<LuohanAgentName, string> = {
    'luohan-wish': '02_愿',
    'luohan-environment': '03_境',
    'luohan-relation': '04_缘',
    'luohan-force': '05_力',
  };
  const allowedFolder = folderByAgent[agent];
  const pathFields = ['touched', 'created', 'updated', 'merged', 'archived', 'written'];
  const badPaths: string[] = [];
  for (const field of pathFields) {
    const value = (receipt as Record<string, unknown>)[field];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item !== 'string') continue;
      const rel = tryNormalizeMemoryProjectRel(item);
      if (!rel || (rel !== allowedFolder && !rel.startsWith(`${allowedFolder}${path.sep}`) && !rel.startsWith(`${allowedFolder}/`))) {
        badPaths.push(`${field}:${item}`);
      }
    }
  }
  return badPaths.length
    ? `Agent contract failed: ${agent} receipt referenced paths outside ${allowedFolder}: ${badPaths.join(', ')}.`
    : undefined;
}

function parseJsonMaybe(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  shouldStop?: (result: R) => boolean,
  shouldCancel?: () => boolean,
): Promise<Array<WorkerResult<R>>> {
  const results: Array<WorkerResult<R> | undefined> = new Array(items.length);
  let nextIndex = 0;
  let stopReason = '';
  async function runWorker() {
    while (nextIndex < items.length) {
      if (shouldCancel?.()) {
        stopReason = 'canceled';
        return;
      }
      if (stopReason) return;
      const index = nextIndex;
      nextIndex += 1;
      try {
        const value = await worker(items[index], index);
        results[index] = { status: 'fulfilled', value };
        if (shouldStop?.(value)) stopReason = 'fatal_result';
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return Array.from(
    { length: items.length },
    (_, index) => results[index] ?? { status: 'skipped', reason: stopReason || 'not_started' },
  );
}

function isFatalFuxiInitError(result: AgentResult) {
  if (result.ok) return false;
  const body = `${result.error || ''}\n${result.rawText || ''}`;
  return /api key|ak\/sk|missing or invalid|unauthorized|authentication|invalid api|valid codingplan subscription|subscription has expired|does not support the coding plan feature|codingplan|sigill|sigkill|signal/i.test(body);
}

async function runFuxiNode(
  state: SocketState,
  socket: WebSocket,
  task: FuxiNodeTask,
) {
  const existing = await findExistingFuxiReport(state, task);
  if (existing) {
    const resultPayload = {
      status: 'done',
      nodeCode: task.code,
      wroteTo: existing.wroteTo,
      triggeredB09: false,
      needsLuohan: false,
      reused: true,
    };
    const rawText = `<fuxi_result>\n${JSON.stringify(resultPayload)}\n</fuxi_result>`;
    emit(state, socket, {
      type: 'fuxi_node_reused',
      turnId: task.turnId,
      nodeCode: task.code,
      nodeName: task.name,
      wroteTo: existing.wroteTo,
      chartAssetId: existing.chartAssetId,
    });
    emit(state, socket, {
      type: 'fuxi_node_done',
      turnId: task.turnId,
      nodeCode: task.code,
      nodeName: task.name,
      ok: true,
      durationMs: 0,
      wroteTo: existing.wroteTo,
      result: JSON.stringify(resultPayload),
    });
    return { ok: true, rawText, visibleText: '', durationMs: 0 };
  }

  emit(state, socket, { type: 'fuxi_node_started', turnId: task.turnId, nodeCode: task.code, nodeName: task.name, nodePath: task.relPath });
  const result = await runAgent(state, socket, {
    agent: 'fuxi',
    role: 'fuxi',
    sessionKey: `fuxi:${task.code}:${task.turnId}`,
    sessionMode: 'stateless',
    message: await buildFuxiPrompt(state.slug, task),
    forbiddenTools: ['bash', 'edit', 'glob', 'grep', 'todowrite', 'webfetch', 'task'],
    forwardText: false,
  });
  const validation = await validateFuxiNodeOutput(state, task, result);
  const finalResult = validation.ok
    ? result
    : {
        ...result,
        ok: false,
        error: validation.error,
      };
  emit(state, socket, {
    type: finalResult.ok ? 'fuxi_node_done' : 'fuxi_node_error',
    turnId: task.turnId,
    nodeCode: task.code,
    nodeName: task.name,
    ok: finalResult.ok,
    durationMs: finalResult.durationMs,
    wroteTo: validation.wroteTo,
    result: extractTag(finalResult.rawText, 'fuxi_result') || finalResult.rawText.trim().slice(0, 2000),
    error: finalResult.error,
  });
  return finalResult;
}

async function findExistingFuxiReport(
  state: SocketState,
  task: FuxiNodeTask,
): Promise<{ wroteTo: string; chartAssetId: string } | null> {
  if (task.code === 'B09') return null;
  const chartAsset = task.chartAsset ?? await readLatestChartAssetRef(state.projectPath);
  if (!chartAsset) return null;
  const expected = path.join('01_命', `${task.code}_${safeNoteFileName(task.name)}.md`);
  try {
    const content = await readFile(resolveInside(state.projectPath, expected), 'utf8');
    if (!content.includes(chartAsset.chartAssetId)) return null;
    return { wroteTo: expected, chartAssetId: chartAsset.chartAssetId };
  } catch {
    return null;
  }
}

async function validateFuxiNodeOutput(
  state: SocketState,
  task: FuxiNodeTask,
  result: AgentResult,
): Promise<{ ok: boolean; wroteTo?: string; error?: string }> {
  if (!result.ok) return { ok: false, error: result.error || 'Fuxi agent failed before output validation.' };

  const parsed = parseFuxiResult(result.rawText);
  if (!parsed) return { ok: false, error: 'Fuxi did not return a parseable <fuxi_result> JSON block.' };
  if (parsed.status !== 'done') return { ok: false, error: `Fuxi result status is not done: ${parsed.status || '(missing)'}` };
  if (parsed.nodeCode !== task.code) return { ok: false, error: `Fuxi result nodeCode mismatch: ${parsed.nodeCode || '(missing)'}` };
  if (task.code !== 'B09' && parsed.triggeredB09 !== false) {
    return { ok: false, error: 'Fuxi result must explicitly report triggeredB09:false for non-B09 nodes.' };
  }

  const chartAsset = task.chartAsset ?? await readLatestChartAssetRef(state.projectPath);
  if (!chartAsset) return { ok: false, error: 'Missing chart asset reference during Fuxi output validation.' };

  const expected = path.join('01_命', `${task.code}_${safeNoteFileName(task.name)}.md`);
  const candidates = uniqueStrings([
    parsed.wroteTo ? tryNormalizeMemoryProjectRel(parsed.wroteTo) : '',
    expected,
  ].filter(Boolean));

  for (const candidate of candidates) {
    const projectRel = candidate.startsWith(`01_命${path.sep}`) || candidate === '01_命'
      ? candidate
      : path.join('01_命', candidate);
    if (!projectRel.endsWith('.md')) continue;
    if (!projectRel.startsWith(`01_命${path.sep}`)) continue;
    if (task.code !== 'B09' && /(^|[/\\])B09[_-]/u.test(projectRel)) {
      return { ok: false, wroteTo: projectRel, error: 'Non-B09 Fuxi task wrote a B09 report path.' };
    }

    try {
      const full = resolveInside(state.projectPath, projectRel);
      const content = await readFile(full, 'utf8');
      if (!content.includes(chartAsset.chartAssetId)) {
        return { ok: false, wroteTo: projectRel, error: `Fuxi report does not reference chart_asset_id ${chartAsset.chartAssetId}.` };
      }
      return { ok: true, wroteTo: projectRel };
    } catch {
      // Try the next candidate.
    }
  }

  return {
    ok: false,
    wroteTo: parsed.wroteTo,
    error: `Fuxi report file was not found. Expected ${expected}.`,
  };
}

function parseFuxiResult(text: string): FuxiResultPayload | null {
  const raw = extractTag(text, 'fuxi_result');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FuxiResultPayload;
  } catch {
    return null;
  }
}

async function runAgent(
  state: SocketState,
  socket: WebSocket,
  input: {
    agent: AgentName;
    role: 'bodhisattva' | 'gongcao' | 'luohan' | 'fuxi';
    message: string;
    sessionKey?: string;
    sessionMode: 'persistent' | 'stateless';
    requiredToolPrefixes?: string[];
    forbiddenTools?: string[];
    forwardText: boolean;
  },
): Promise<AgentResult> {
  if (state.closed) {
    return { ok: false, rawText: '', visibleText: '', durationMs: 0, error: 'Socket closed before agent started.' };
  }
  const profiles = resolveProviderProfiles(input.role);
  if (profiles.length === 0) {
    const error = `Missing provider configuration for ${input.role}. Required API key/model/base URL is not available.`;
    emit(state, socket, { type: 'config_error', agent: input.agent, role: input.role, message: error });
    return { ok: false, rawText: '', visibleText: '', durationMs: 0, error };
  }

  let lastResult: AgentResult | undefined;
  for (let attempt = 0; attempt < profiles.length; attempt += 1) {
    const provider = profiles[attempt];
    const result = await runAgentAttempt(state, socket, input, provider, attempt + 1);
    if (result.ok || attempt === profiles.length - 1 || !isProviderFallbackEligible(result)) return result;
    lastResult = result;
    emit(state, socket, {
      type: 'provider_fallback',
      agent: input.agent,
      role: input.role,
      fromProvider: provider.name,
      toProvider: profiles[attempt + 1]?.name,
      reason: result.error || 'provider_failed',
    });
  }
  return lastResult ?? { ok: false, rawText: '', visibleText: '', durationMs: 0, error: 'No provider attempt was executed.' };
}

async function runAgentAttempt(
  state: SocketState,
  socket: WebSocket,
  input: {
    agent: AgentName;
    role: 'bodhisattva' | 'gongcao' | 'luohan' | 'fuxi';
    message: string;
    sessionKey?: string;
    sessionMode: 'persistent' | 'stateless';
    requiredToolPrefixes?: string[];
    forbiddenTools?: string[];
    forwardText: boolean;
  },
  provider: ClaudeCodeProviderProfile,
  attempt: number,
): Promise<AgentResult> {
  const startedAt = Date.now();

  const before = await snapshotMemoryProject(state.projectPath);
  const timeoutMs = resolveAgentTimeoutMs(input.role);
  emit(state, socket, {
    type: 'agent_started',
    agent: input.agent,
    role: input.role,
    provider: provider.name,
    model: provider.model,
    attempt,
    sessionMode: input.sessionMode,
    timeoutMs,
  });

  let rawText = '';
  const toolCalls: string[] = [];
  let contractError: string | undefined;
  let stopRun: (() => void) | undefined;
  let resolved = false;
  let streamedVisible = false;
  const visibleFilter =
    input.agent === 'bodhisattva' && input.forwardText ? new UserVisibleStreamFilter() : null;
  const forbiddenTools = input.forbiddenTools ?? ['read', 'glob', 'grep', 'bash', 'edit'];

  return await new Promise<AgentResult>((resolve) => {
    void runner.sendTurn(
      {
        slug: state.slug,
        runId: state.runId,
        agent: input.agent,
        sessionKey: input.sessionKey,
        message: input.message,
        provider,
        sessionMode: input.sessionMode,
        runtimeRoot,
        basicMemory: state.basicMemory,
        timeoutMs,
      },
      {
        onEvent: (event) => {
          const tool = summarizeToolEvent(event);
          if (tool) {
            toolCalls.push(tool.tool);
            emit(state, socket, { type: 'tool_call', agent: input.agent, ...tool });
            void appendToolCall(state, { agent: input.agent, ...tool });
            if (forbiddenTools.includes(tool.tool.toLowerCase()) && !contractError) {
              contractError = `Agent contract failed: ${input.agent} used forbidden Claude Code tool ${tool.tool}. Use MCP tools only.`;
              emit(state, socket, { type: 'agent_contract_error', agent: input.agent, role: input.role, message: contractError, toolCalls: [...toolCalls] });
              if (stopRun) {
                state.activeRuns.delete(stopRun);
                stopRun();
              }
            }
          }
        },
        onText: (text) => {
          rawText += text;
          if (input.forwardText) {
            if (visibleFilter) {
              const visible = visibleFilter.push(text);
              if (visible) {
                streamedVisible = true;
                emit(state, socket, { type: 'agent_text_delta', agent: input.agent, text: visible });
              }
            } else {
              emit(state, socket, { type: 'agent_text_delta', agent: input.agent, text });
            }
          }
        },
        onError: (error) => {
          emit(state, socket, { type: 'agent_error', agent: input.agent, message: error.message });
        },
        onDone: async (summary) => {
          if (stopRun) state.activeRuns.delete(stopRun);
          const durationMs = Date.now() - startedAt;
          const after = await snapshotMemoryProject(state.projectPath);
          const diff = diffSnapshots(before, after);
          const finalRawText = sanitizeModelText(rawText);
          if (contractError) {
            await appendMemoryDiff(state, input.agent, diff);
            emit(state, socket, { type: 'agent_done', agent: input.agent, role: input.role, durationMs, summary, memoryDiff: diff });
            resolved = true;
            resolve({
              ok: false,
              rawText: finalRawText,
              visibleText: extractTag(finalRawText, 'user_visible') || '',
              durationMs,
              toolCalls,
              error: contractError,
              streamedVisible,
            });
            return;
          }
          const missingRequiredTool = input.requiredToolPrefixes?.length
            ? !toolCalls.some((toolName) => input.requiredToolPrefixes?.some((prefix) => toolName.startsWith(prefix)))
            : false;
          if (missingRequiredTool) {
            const visibleText = extractTag(finalRawText, 'user_visible') || finalRawText.trim();
            const softContract =
              input.role === 'bodhisattva' &&
              input.agent === 'bodhisattva' &&
              !!visibleText &&
              envValue('BODHISATTVA_SOFT_MEMORY_CONTRACT') !== '0';
            if (softContract) {
              const warning = `Agent contract warning: ${input.agent} skipped required memory tools but produced a user-visible reply.`;
              emit(state, socket, {
                type: 'agent_contract_warning',
                agent: input.agent,
                role: input.role,
                message: warning,
                toolCalls,
              });
              await appendMemoryDiff(state, input.agent, diff);
              emit(state, socket, { type: 'agent_done', agent: input.agent, role: input.role, durationMs, summary, memoryDiff: diff });
              resolved = true;
              resolve({
                ok: true,
                rawText: finalRawText,
                visibleText,
                durationMs,
                toolCalls,
                streamedVisible,
              });
              return;
            }
            const message = `Agent contract failed: ${input.agent} did not call a required tool prefix (${input.requiredToolPrefixes?.join(', ')}).`;
            emit(state, socket, { type: 'agent_contract_error', agent: input.agent, role: input.role, message, toolCalls });
            await appendMemoryDiff(state, input.agent, diff);
            emit(state, socket, { type: 'agent_done', agent: input.agent, role: input.role, durationMs, summary, memoryDiff: diff });
            resolved = true;
            resolve({
              ok: false,
              rawText: finalRawText,
              visibleText: extractTag(finalRawText, 'user_visible') || '',
              durationMs,
              toolCalls,
              error: message,
              streamedVisible,
            });
            return;
          }
          await appendMemoryDiff(state, input.agent, diff);
          emit(state, socket, { type: 'agent_done', agent: input.agent, role: input.role, durationMs, summary, memoryDiff: diff });
          resolved = true;
          resolve({
            ok: summary.exitCode === 0,
            rawText: finalRawText,
            visibleText: extractTag(finalRawText, 'user_visible') || '',
            durationMs,
            toolCalls,
            error: summary.exitCode === 0 ? undefined : `Claude Code exited with ${summary.exitCode ?? summary.signal}`,
            streamedVisible,
          });
        },
      },
    ).then((run) => {
      stopRun = run.stop;
      state.activeRuns.add(stopRun);
      if (contractError) {
        state.activeRuns.delete(stopRun);
        stopRun();
      }
      if (state.closed) stopRun();
    }).catch((error: unknown) => {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      emit(state, socket, { type: 'agent_error', agent: input.agent, message });
      if (!resolved) resolve({ ok: false, rawText, visibleText: '', durationMs, error: message });
    });
  });
}

function buildBodhisattvaPrompt(
  slug: string,
  turnId: string,
  text: string,
  prefetchContext = '',
  recentTranscript = '',
) {
  const prefetchBlock = prefetchContext
    ? [
        '## Server-prefetched context (already loaded for this turn)',
        'Use this as your starting context. You may still call fate_memory tools if you need deeper or fresher notes.',
        prefetchContext,
        '',
      ]
    : [
        'Progressive context rule: person memory / Fuxi reports may still be empty.',
        'If memory tools return nothing useful, answer with general conversational ability grounded in the user message only. Do not invent detailed destiny reports.',
        'Optional: call memory_list_notes once to check whether new notes appeared; if empty, continue without tools.',
        '',
      ];
  const transcriptBlock = recentTranscript.trim()
    ? [
        '## Recent conversation (do not repeat what you already said)',
        recentTranscript.trim(),
        '',
      ]
    : [];
  const trimmed = text.trim();
  const isShortGreeting = trimmed.length <= 12 && /^(你好|在吗|嗨|hi|hello|hey|早上好|晚上好|下午好)/iu.test(trimmed);
  return [
    '# BODHISATTVA LIVE TURN',
    '',
    `Person project slug: ${slug}`,
    `Turn id: ${turnId}`,
    '',
    ...prefetchBlock,
    ...transcriptBlock,
    'You are the front-line Bodhisattva agent.',
    'Progressive enrichment rule (critical): each turn prefer the newest available notes. When 01_命/_bootstrap_plan.md or Fuxi L1–L3 reports exist, ground the answer in them. When they do not exist yet, chat helpfully without pretending deep analysis is finished.',
    'If context exists: use fate_memory read tools to read sufficient context before answering. Read enough from 01_命 L0-L3, 02_愿, 03_境, 04_缘, 05_力, 06_功曹, and 07_上下文包 when relevant.',
    'Hybrid bootstrap rule: if deep Fuxi reports are still generating, read 01_命/_bootstrap_plan.md first for life-language portrait, stage, and action hints. Once A01–A05+ Fuxi reports exist, prefer those over the bootstrap note.',
    'Context sufficiency rule: when notes exist, start with memory.list_notes/search/build_context, then read the specific Fuxi reports, Luohan topic-network nodes, and Gongcao routing memory that the question needs.',
    'For chart foundation, prefer 01_命/L0_模型事实上下文.md plus 01_命/_bootstrap_plan.md or relevant L1/L2/L3 Fuxi reports. You may read long reports with explicit maxChars values large enough for the current issue, but do not use maxChars "full" in Bodhisattva turns.',
    'Do not use Claude Code built-in Read/Glob/Grep/Bash/Edit for person memory or contextual retrieval. Use fate_memory read/search/build_context/list tools only.',
    'Do not write long-term memory. Do not create or edit notes.',
    'Response length rule (critical): match the user message. Short greeting or ping → 1-2 sentences. Simple question → 2-5 sentences. Complex emotional share or explicit request for depth → up to 8 sentences, never an essay.',
    isShortGreeting
      ? 'This turn is a short greeting: reply warmly in at most 2 short sentences. Do not introduce their life story, bootstrap plan, or chart background unless they ask.'
      : '',
    'Anti-repetition rule (critical): read recent conversation above. Do NOT reuse the same opening, welcome line, portrait recap, or stage summary. Do NOT re-dump bootstrap content each turn. Answer only what is new in this message.',
    'User-visible language rule: use life language first. Do not expose 八字/紫微/流年/大限/宫位/星曜/四化/十神/冲刑合害 terms in <user_visible> unless the user explicitly asks for命理/排盘/术语 explanation.',
    'Also do not expose internal interpretation labels such as 偏燥, 偏亢, 调候, 五行, 格局, 用神, 忌神, 木火, 水火, 金水, 底层结构, 能量结构, or 命盘显示 in <user_visible> unless the user explicitly asks for technical metaphysics language.',
    'Translate chart evidence into stage, rhythm, pressure, relationship, resource, body state, and next-action language. Prefer phrases like 你现在更容易被点燃, 大脑停不下来, 身体需要硬切断, 这不是意志力问题.',
    'Writeback boundary: your <writeback_candidate> is only source material for Gongcao. Never suggest Gongcao or Luohan should write 01_命. Never suggest direct edits to 01_命, 02_愿, 03_境, 04_缘, or 05_力.',
    'If chart evidence is enough, say no Fuxi trigger. If chart evidence is insufficient, suggest TRIGGER_FUXI with a node/task; Fuxi is the only agent that may write 01_命.',
    '',
    'User original text:',
    `「${text}」`,
    '',
    'Required output protocol:',
    '<user_visible>',
    '面向用户的自然语言回答。长度随问题自适应：问候要短，复杂问题才可稍长。不要重复上一轮已说过的句子或整段底色/近几年摘要。默认使用生活语言，不暴露工具调用、内部标签、命理术语堆砌、MCP、数据库或文件路径。除非用户主动问命理/排盘/术语，否则不要出现八字、紫微、流年、大限、宫位、星曜、四化、十神、冲刑合害、偏燥、偏亢、调候、五行、格局、用神、忌神、木火、水火、金水、底层结构、能量结构、命盘显示等内部术语。',
    '</user_visible>',
    '',
    '<writeback_candidate>',
    '用 Markdown 给功曹的候选材料：原文、显性事实、推测、待印证、可能涉及命/愿/境/缘/力、建议是否路由。只给候选，不给越权写入建议；命盘相关只能建议“不触发伏羲”或“触发伏羲”，不能建议功曹/罗汉改写 01_命。若本轮尚无可用记忆，写 NO_ACTION 即可。',
    '</writeback_candidate>',
  ].join('\n');
}

function buildOpeningPrompt(slug: string, birthProfile: unknown, failedFuxiNodes: number, prefetchContext = '') {
  void birthProfile;
  const prefetchBlock = prefetchContext
    ? [
        '## Server-prefetched context (already loaded for opening)',
        prefetchContext,
        '',
      ]
    : [
        'Progressive context rule: notes may still be empty after birth profile save.',
        'If memory is empty, give a short warm opening and invite the user to talk. Do not invent deep destiny reports.',
        '',
      ];
  return [
    '# BODHISATTVA OPENING AFTER INITIALIZATION',
    '',
    `Person project slug: ${slug}`,
    '',
    ...prefetchBlock,
    'Prefer fate_memory read tools when notes exist. If they do not, open the conversation without pretending analysis is finished.',
    'Hybrid bootstrap rule: if only the fast-track bootstrap exists, read 01_命/_bootstrap_plan.md with maxChars 4000. Otherwise read 01_命/L0_模型事实上下文.md when available.',
    'Opening context budget rule: read only 01_命/L0_模型事实上下文.md, 01_命/_bootstrap_plan.md, or build_context with maxChars 4000. Do not read full Fuxi reports in the opening.',
    'Do not use Claude Code built-in Read/Glob/Grep/Bash/Edit for person memory or contextual retrieval. Use fate_memory read/search/build_context/list tools only.',
    'Do not write long-term memory.',
    'User-visible language rule: keep the opening short and life-facing. Do not mention internal report counts, node initialization, internal structure charts, file paths, birth details, gender labels like 男命/女命, 命盘, 命理术语, or internal labels like 偏燥/偏亢/底层结构/能量结构 unless the user explicitly asks.',
    'Do not repeat the birth date, birth place, gender, chart foundation, or any metaphysics wording. The opening should only say basic information is ready (or that you can talk now while deeper understanding continues) and invite the user to talk about the current issue.',
    '',
    `Fuxi initialization failed nodes: ${failedFuxiNodes}`,
    '',
    'Required output protocol:',
    '<user_visible>',
    '给用户一个简短开场：可以说基础信息已经准备好、可以先聊；若深度报告还在生成，不要渲染成“还不能聊”。不要复述出生时间、出生地、性别、男命/女命，不要说命盘/命理/八字/紫微/流年/宫位，不要暴露内部路径、报告数量、节点初始化、底层结构图。',
    '</user_visible>',
    '',
    '<writeback_candidate>',
    '本轮通常 NO_ACTION；若配置失败，只给功曹记录配置问题。',
    '</writeback_candidate>',
  ].join('\n');
}

async function loadBodhisattvaPrefetchContext(projectPath: string): Promise<string> {
  const candidates = ['01_命/_bootstrap_plan.md', '01_命/L0_模型事实上下文.md'];
  const chunks: string[] = [];
  for (const rel of candidates) {
    try {
      const { content, truncated } = await readProjectFile(projectPath, rel, 4000);
      if (content.trim()) {
        chunks.push(`### ${rel}${truncated ? ' (truncated)' : ''}\n${content.trim()}`);
      }
    } catch {
      /* note may not exist yet */
    }
  }
  return chunks.join('\n\n');
}

async function loadRecentTranscriptTail(runRoot: string, maxChars = 2400): Promise<string> {
  try {
    const content = await readFile(path.join(runRoot, 'transcript.md'), 'utf8');
    if (!content.trim()) return '';
    return content.length > maxChars ? content.slice(-maxChars) : content;
  } catch {
    return '';
  }
}

function buildGongcaoBatchPrompt(
  slug: string,
  batchId: string,
  batch: GongcaoInboxItem[],
) {
  return [
    '# GONGCAO BACKLOG DRAIN',
    '',
    `Person project slug: ${slug}`,
    `Batch id: ${batchId}`,
    '',
    'Use fate_memory read tools and memory.write_gongcao. You may write only under 06_功曹.',
    'Read routing memory sufficiently: routing-memory.md, recent dispatch/receipt logs, and any 06_功曹 context needed to know which Luohan roughly maintains what.',
    'You are the light dispatcher in the loop. Your job is light judgement, multicast, communication audit, and routing memory. You are not a second Bodhisattva and not a central portrait engine.',
    'For post_turn_packet items, preserve user original text and decide light multicast.',
    'For agent_receipt items, default to LOG_ONLY: write receipt audit and update routing memory, then output no new dispatch.',
    'A Luohan luohan_note may mention possible transfer or future co-routing. Treat that as routing-memory signal for the next post_turn_packet, not as same-turn dispatch permission.',
    'Only continue same-turn dispatch for agent_receipt when top-level receipt.needs_retry is true, or receipt.status is error / needs_more_context / contract_error.',
    'Only trigger Fuxi from a receipt when it explicitly says a preset Fuxi node is missing and the current issue cannot be handled without it.',
    'The same material may be delivered to multiple Luohans. Delivery is not classification; it is only saying: this scene may concern you, read it and decide yourself.',
    'Envelope to Luohan must contain only scene, user original text, Bodhisattva reply/candidate, and a short delivery note. Do not tell Luohan what to write, which topic name to use, or which category it belongs to.',
    'If a missing preset Fuxi node is needed for a命-related question or a major decision, emit a fuxiTasks item. Fuxi is the only agent that writes 01_命.',
    'Append compact audit to 06_功曹. Suitable files: routing-memory.md, events.jsonl, dispatch.jsonl, receipts.jsonl. JSONL append is allowed for audit logs.',
    'Do not write 01_命, 02_愿, 03_境, 04_缘, or 05_力.',
    'Do not use Claude Code built-in Read/Glob/Grep/Bash/Edit on memory projects; use fate_memory tools only.',
    '',
    'Backlog batch JSON:',
    JSON.stringify(batch, null, 2),
    '',
    'Required output protocol: return exactly one valid JSON object inside <gongcao_dispatch>.',
    'Use dispatches for Luohan multicast. Use fuxiTasks for Fuxi preset node补充. Empty arrays are valid.',
    'Schema:',
    '{',
    '  "type": "NO_ACTION | LOG_ONLY | DISPATCH_LUOHAN | TRIGGER_FUXI | ASK_CLARIFICATION_LATER | MIXED",',
    '  "reason": "...",',
    '  "dispatches": [',
    '    {',
    '      "agents": ["luohan-wish", "luohan-environment", "luohan-relation", "luohan-force"],',
    '      "scene": "这批材料是在什么对话场景下出现的",',
    '      "turns": [{"turn_id":"...","time":"...","user_text":"...","bodhisattva_reply":"..."}],',
    '      "delivery_note": "这批材料可能与你有关，请按你的领域理解自行处理。"',
    '    }',
    '  ],',
    '  "fuxiTasks": [{"nodeCode":"F44","nodePath":"F_动态参照报告/44_当前困惑调用报告_{用户当前问题}.md","task":"...","reason":"..."}]',
    '}',
    '',
    '<gongcao_dispatch>',
    '{"type":"NO_ACTION","reason":"replace with actual route","dispatches":[],"fuxiTasks":[]}',
    '</gongcao_dispatch>',
  ].join('\n');
}

function buildLuohanBatchPrompt(slug: string, batchId: string, agent: LuohanAgentName, batch: LuohanEnvelope[]) {
  const folderByAgent: Record<string, string> = {
    'luohan-wish': '02_愿',
    'luohan-environment': '03_境',
    'luohan-relation': '04_缘',
    'luohan-force': '05_力',
  };
  const writeToolByAgent: Record<string, string> = {
    'luohan-wish': 'memory.write_luohan_wish',
    'luohan-environment': 'memory.write_luohan_environment',
    'luohan-relation': 'memory.write_luohan_relation',
    'luohan-force': 'memory.write_luohan_force',
  };
  return [
    '# LUOHAN BATCH MEMORY TASK',
    '',
    `Person project slug: ${slug}`,
    `Batch id: ${batchId}`,
    `Agent: ${agent}`,
    `Allowed write folder: ${folderByAgent[agent]}`,
    `Allowed write tool: ${writeToolByAgent[agent]}`,
    '',
    'Use fate_memory read tools. Read your own folder and the relevant 06_功曹 dispatch context sufficiently before writing.',
    'When search/list/build_context/dispatch returns note paths, pass those paths into memory.read_note. Treat paths as MCP note identifiers, not local files.',
    'Process all unread envelopes in this batch together. The batch may contain several scenes; read them as a field of signals, not as isolated tickets.',
    'You decide which parts are worth recording, which existing notes to update, which topic nodes to merge, and which material is only background.',
    'Use only your matching memory.write_luohan_* tool for writes. Preserve user original text in observations.',
    'Receipt path rule: touched means "memory files I personally maintained", not "files I read". touched, created, updated, merged, archived, and written may contain only files under your allowed folder. Put 06_功曹 files and other read-only context paths into read_context_paths or luohan_note.',
    '',
    'Topic network growth method:',
    '- Let the network grow from the user’s actual expression habits.',
    '- A topic node may center on a person, event, time period, place, project, pressure, resource, relationship, question, repeated phrase, or mixed cluster.',
    '- Prefer titles close to the user’s own wording at first. When repeated material reveals a deeper stable shape, rename or merge the node and keep the old wording as aliases.',
    '- Each node should keep original quotes, current understanding, open questions, related nodes, salience, stability, and update log.',
    '- Multiple weak signals can stay as pending or phase observations until the user confirms or reality repeats.',
    '- When several notes describe the same living issue, update/merge the older node so the memory becomes clearer instead of broader.',
    '- Use `_network/index.md` as the field map for your domain. Use `_network/nodes/*.md` for active topics when that helps reviewability.',
    '- Let the shape differ by person: some people organize around people, some around projects, some around time periods, some around repeated constraints.',
    '',
    'Batch from Gongcao:',
    JSON.stringify(batch, null, 2),
    '',
    'Do not use Claude Code built-in Read/Glob/Grep/Bash/Edit for person memory or contextual retrieval. Use fate_memory read/search/build_context/list tools only.',
    '',
    'Required output protocol:',
    'Final self-check before output: every path in touched/created/updated/merged/archived/written must start with your allowed folder. Remove all 06_功曹 paths from those arrays.',
    '<luohan_batch_result>',
    '{"status":"done","processed_task_ids":[],"touched":[],"created":[],"updated":[],"merged":[],"archived":[],"read_context_paths":[],"luohan_note":"由罗汉自己概括本批处理结果和给功曹的路由记忆提示","needs_retry":false}',
    '</luohan_batch_result>',
  ].join('\n');
}

async function buildFuxiPrompt(slug: string, task: FuxiNodeTask) {
  const chartAsset = task.chartAsset ?? await readLatestChartAssetRef(resolveInside(memoryRoot, slug));
  const nodePromptPath = await materializeFuxiNodePrompt(slug, task);
  const outputFile = `${task.code}_${safeNoteFileName(task.name)}.md`;
  return [
    '# FUXI NODE EXECUTION',
    '',
    `Person project slug: ${slug}`,
    `Turn id: ${task.turnId}`,
    `Node code: ${task.code}`,
    `Node name: ${task.name}`,
    `Node path: ${nodePromptPath}`,
    `Node source path: ${path.join(projectRoot, 'fuxi-nodes', task.relPath)}`,
    `Trigger level: ${task.triggerLevel}`,
    `Trigger reason: ${task.triggerReason}`,
    '',
    'The L0 chart asset is already calculated and must be treated as the single chart fact source for this node.',
    `chart_asset_id: ${chartAsset?.chartAssetId ?? '(missing)'}`,
    `memory.read_note path for chart_context: ${chartAsset?.contextPath ?? '(missing)'}`,
    `memory.read_note path for l0_context_file: ${chartAsset?.l0ContextPath ?? '(missing)'}`,
    `memory.read_note path for chart_asset_json: ${chartAsset?.jsonPath ?? '(missing)'}`,
    `memory.read_note path for chart_asset_markdown: ${chartAsset?.markdownPath ?? '(missing)'}`,
    `memory.read_note path for l0_fact_file: ${chartAsset?.l0Path ?? '(missing)'}`,
    `memory.write_fuxi target path: ${outputFile}`,
    `Final project-relative report path: 01_命/${outputFile}`,
    'Do not recalculate BaZi or Ziwei for this node. If the chart asset is missing, return an error instead of improvising.',
    'Do not use any chart calculation tool in this node. Chart calculation is already completed by the L0 Chart Asset Step.',
    'Fuxi maintains 01_命 L0-L3. L0 is chart facts only. This node should write the appropriate L1/L2/L3/report layer according to the node prompt:',
    '- L1: lifelong base, natal structure, Bazi climate, Ziwei life map, mechanism cards.',
    '- L2: major luck/major periods, current decade, stage-level fate tendency.',
    '- L3: current year, career/wealth/relationship/health presets, and Gongcao-triggered topical supplements.',
    'Reality text is directional input for L3 focus and calibration; it is not reality memory and must not be written outside 01_命.',
    'Use Methodology MCP only for method references.',
    'The node path above is a materialized runtime prompt file. Read exactly that path. Do not substitute placeholders, search directories, list folders, or infer an alternative prompt path.',
    'Use the normal read tool only for the exact node path above or explicit methodology/docs files supplied in this prompt.',
    'Use fate_memory memory.read_note for every file under the person memory project, including all L0 chart assets.',
    'In Claude Code runtime this tool is exposed as mcp__fate_memory__memory_read_note.',
    'Fuxi is the only role allowed to request memory.read_note maxChars "full"; use it only for chart assets or source reports needed by this node.',
    'Use fate_memory memory.write_fuxi for the final report. In Claude Code runtime this tool is exposed as mcp__fate_memory__memory_write_fuxi.',
    'Do not use Claude Code built-in edit/write tools for memory files.',
    'Do not use task, skill, webfetch, or todowrite. This node must remain a single auditable Fuxi run.',
    'When calling memory.write_fuxi, the path argument is relative to 01_命. Prefer exactly the target path above.',
    'Do not write 02_愿, 03_境, 04_缘, 05_力, or 06_功曹.',
    'B09 must not be generated unless the explicit node code is B09. This task is not B09 unless node code says B09.',
    '',
    'Birth profile if provided:',
    JSON.stringify(task.birthProfile, null, 2),
    '',
    'Reality text if provided:',
    task.userText ? `「${task.userText}」` : '(none)',
    '',
    'Execution steps:',
    `1. Read exactly ${nodePromptPath}. Execute that prompt deeply; do not replace it with a short template.`,
    '2. Read chart_context and l0_context_file first through memory.read_note using the paths above.',
    '3. Read chart_asset_markdown next. Read chart_asset_json only if the context files are insufficient for the node.',
    '4. Compose the full node report according to the node prompt.',
    '5. Write the full report through memory.write_fuxi using the target path above.',
    '6. The report must include the exact chart_asset_id in its Source section.',
    '7. Return the fuxi_result block after the MCP write succeeds.',
    '',
    'Required output protocol:',
    '<fuxi_result>',
    '{"status":"done","nodeCode":"' + task.code + '","wroteTo":"01_命/' + outputFile + '","triggeredB09":false,"needsLuohan":false}',
    '</fuxi_result>',
  ].join('\n');
}

async function materializeFuxiNodePrompt(slug: string, task: FuxiNodeTask) {
  const sourcePath = path.join(projectRoot, 'fuxi-nodes', task.relPath);
  const source = await readFile(sourcePath, 'utf8');
  const targetYear = String(new Date().getFullYear());
  const bound = source
    .replaceAll('{目标年份}', targetYear)
    .replaceAll('{当前年龄或指定大限}', `当前十年_${targetYear}`)
    .replaceAll('{用户当前问题}', task.userText ? safeNoteFileName(task.userText).slice(0, 80) : `当前问题_${targetYear}`);
  const targetDir = path.join(runtimeRoot, 'fuxi-node-prompts', slug, task.turnId);
  await mkdir(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, `${task.code}_${safeNoteFileName(task.name)}.md`);
  const content = [
    '# Materialized Fuxi Node Prompt',
    '',
    `Source prompt: ${sourcePath}`,
    `Node code: ${task.code}`,
    `Node name: ${task.name}`,
    `Target year: ${targetYear}`,
    `Trigger level: ${task.triggerLevel}`,
    `Trigger reason: ${task.triggerReason}`,
    '',
    'This file is generated by the Host from the original node prompt. It only binds template variables and does not change the Fuxi method.',
    '',
    '---',
    '',
    bound,
  ].join('\n');
  await writeFile(targetPath, content, 'utf8');
  return targetPath;
}

function resolveProviderProfiles(role: 'bodhisattva' | 'gongcao' | 'luohan' | 'fuxi'): ClaudeCodeProviderProfile[] {
  const profiles: ClaudeCodeProviderProfile[] = [];
  if (role === 'fuxi') {
    const apiKey = envValue('ARK_API_KEY');
    const model = envValue('CLAUDE_MODEL_FUXI') || 'deepseek-v4-pro';
    const baseUrl = envValue('ARK_ANTHROPIC_BASE_URL') || 'https://ark.cn-beijing.volces.com/api/plan';
    if (apiKey && model && baseUrl) profiles.push({ name: 'ark-deepseek-fuxi', model, baseUrl, apiKey });
    return profiles;
  }

  const roleModelEnv: Record<'bodhisattva' | 'gongcao' | 'luohan', string> = {
    bodhisattva: 'CLAUDE_MODEL_BODHISATTVA',
    gongcao: 'CLAUDE_MODEL_GONGCAO',
    luohan: 'CLAUDE_MODEL_LUOHAN',
  };
  const minimaxKey = envValue('MINIMAX_API_KEY');
  const minimaxEnabled = envValue('MINIMAX_ENABLED') !== '0';
  const minimaxModel = envValue(roleModelEnv[role]) || 'MiniMax-M3';
  const minimaxBaseUrl = envValue('MINIMAX_ANTHROPIC_BASE_URL') || 'https://api.minimaxi.com/anthropic';
  if (minimaxEnabled && minimaxKey && minimaxModel && minimaxBaseUrl) {
    profiles.push({ name: 'minimax-m3', model: minimaxModel, baseUrl: minimaxBaseUrl, apiKey: minimaxKey });
  }

  const arkKey = envValue('ARK_API_KEY');
  const fallbackModel = envValue('CLAUDE_FALLBACK_MODEL') || 'ark-code-latest';
  const arkBaseUrl = envValue('ARK_ANTHROPIC_BASE_URL') || 'https://ark.cn-beijing.volces.com/api/plan';
  if (arkKey && fallbackModel && arkBaseUrl) {
    profiles.push({ name: 'ark-code-fallback', model: fallbackModel, baseUrl: arkBaseUrl, apiKey: arkKey });
  }
  return profiles;
}

function envValue(name: string) {
  return process.env[name]?.trim() || '';
}

function envInt(name: string, fallback: number) {
  const raw = envValue(name);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function resolveAgentTimeoutMs(role: 'bodhisattva' | 'gongcao' | 'luohan' | 'fuxi') {
  const globalTimeout = envInt('CLAUDE_CODE_AGENT_TIMEOUT_MS', 0);
  if (globalTimeout) return globalTimeout;
  if (role === 'fuxi') return envInt('CLAUDE_CODE_FUXI_TIMEOUT_MS', 900_000);
  if (role === 'gongcao') return envInt('CLAUDE_CODE_GONGCAO_TIMEOUT_MS', 180_000);
  if (role === 'bodhisattva') return envInt('CLAUDE_CODE_BODHISATTVA_TIMEOUT_MS', 240_000);
  return envInt('CLAUDE_CODE_LUOHAN_TIMEOUT_MS', 240_000);
}

function isProviderFallbackEligible(result: AgentResult) {
  const body = `${result.error || ''}\n${result.rawText || ''}`;
  return /timeout|timed out|rate limit|429|500|502|503|504|overloaded|unavailable|provider|network|ECONN|ETIMEDOUT|EAI_AGAIN|Claude Code exited|authentication|unauthorized|api key|invalid api/i.test(body);
}

function extractTag(text: string, tag: string) {
  const pattern = new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`, 'i');
  return sanitizeModelText(pattern.exec(text)?.[1]?.trim() || '');
}

function sanitizeModelText(text: string) {
  return text
    .replace(/\]<\]minimax\[>\[/giu, '')
    .trimEnd();
}

function parseGongcaoRoute(text: string): RouteDecision | null {
  const raw = extractTag(text, 'gongcao_dispatch') || extractTag(text, 'gongcao_route');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RouteDecision;
  } catch {
    return parseLooseGongcaoRoute(raw);
  }
}

function parseLooseGongcaoRoute(raw: string): RouteDecision | null {
  const type = /"type"\s*:\s*"([^"]+)"/u.exec(raw)?.[1];
  if (!type) return null;
  const recoveredLuohanTasks = extractJsonArrayField(raw, 'luohanTasks') ?? extractLooseTaskArray(raw, 'luohanTasks');
  const recoveredFuxiTasks = extractJsonArrayField(raw, 'fuxiTasks') ?? extractLooseTaskArray(raw, 'fuxiTasks');
  return {
    type,
    reason: extractLooseJsonReason(raw) || 'Gongcao returned malformed JSON; host recovered route type and task arrays.',
    luohanTasks: filterExecutableTasks(recoveredLuohanTasks) as RouteDecision['luohanTasks'],
    fuxiTasks: filterExecutableTasks(recoveredFuxiTasks) as RouteDecision['fuxiTasks'],
    parseWarning: 'recovered_from_malformed_json',
  };
}

function extractLooseJsonReason(raw: string) {
  const match = /"reason"\s*:\s*"([\s\S]*)"\s*,\s*"luohanTasks"/u.exec(raw);
  return match?.[1]?.trim() || '';
}

function extractJsonArrayField(raw: string, field: string): unknown[] | null {
  const marker = `"${field}"`;
  const markerIndex = raw.indexOf(marker);
  if (markerIndex < 0) return null;
  const arrayStart = raw.indexOf('[', markerIndex + marker.length);
  if (arrayStart < 0) return null;
  const arrayEnd = findBalancedArrayEnd(raw, arrayStart);
  if (arrayEnd < 0) return null;
  try {
    const parsed = JSON.parse(raw.slice(arrayStart, arrayEnd + 1)) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractLooseTaskArray(raw: string, field: string): Array<Record<string, string>> | null {
  const marker = `"${field}"`;
  const markerIndex = raw.indexOf(marker);
  if (markerIndex < 0) return null;
  const arrayStart = raw.indexOf('[', markerIndex + marker.length);
  if (arrayStart < 0) return null;
  const nextFieldMatch = /,\s*"(?:luohanTasks|fuxiTasks)"\s*:/u.exec(raw.slice(arrayStart + 1));
  const fallbackEnd = raw.indexOf(']', arrayStart);
  const arrayEnd = nextFieldMatch
    ? arrayStart + 1 + nextFieldMatch.index
    : fallbackEnd >= 0 ? fallbackEnd : raw.length;
  const arrayText = raw.slice(arrayStart, arrayEnd);
  const tasks: Array<Record<string, string>> = [];
  const pattern = /\{\s*"agent"\s*:\s*"([^"]+)"\s*,\s*"task"\s*:\s*"([\s\S]*?)"\s*,\s*"reason"\s*:\s*"([\s\S]*?)"\s*\}/gu;
  for (const match of arrayText.matchAll(pattern)) {
    tasks.push({
      agent: match[1],
      task: match[2].trim(),
      reason: match[3].trim(),
    });
  }
  const fuxiPattern = /\{\s*"nodeCode"\s*:\s*"([^"]+)"\s*,\s*"nodePath"\s*:\s*"([\s\S]*?)"\s*,\s*"task"\s*:\s*"([\s\S]*?)"\s*,\s*"reason"\s*:\s*"([\s\S]*?)"\s*\}/gu;
  for (const match of arrayText.matchAll(fuxiPattern)) {
    tasks.push({
      nodeCode: match[1],
      nodePath: match[2].trim(),
      task: match[3].trim(),
      reason: match[4].trim(),
    });
  }
  return tasks.length > 0 ? tasks : null;
}

function filterExecutableTasks(tasks: unknown[] | null): unknown[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter((task) => {
    if (!task || typeof task !== 'object') return false;
    const body = JSON.stringify(task);
    return !/暂不派发|不要派发|不派发|future conditional|待用户回答后再判断/iu.test(body);
  });
}

function findBalancedArrayEnd(raw: string, start: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

async function ensureFuxiChartAsset(
  state: SocketState,
  socket: WebSocket,
  birthProfile: Record<string, unknown>,
  turnId: string,
): Promise<ChartAssetRef | null> {
  emit(state, socket, { type: 'chart_asset_started', turnId });
  try {
    let asset: ChartAsset;
    if (birthProfile.chartAsset && typeof birthProfile.chartAsset === 'object') {
      asset = birthProfile.chartAsset as ChartAsset;
    } else {
      asset = createChartAsset({
        ...birthProfile,
        personId: state.slug,
      });
    }
    const ref = await writeChartAsset(state.projectPath, asset);
    await appendTurn(state, {
      turnId,
      type: 'chart_asset',
      chartAssetId: ref.chartAssetId,
      jsonPath: ref.jsonPath,
      markdownPath: ref.markdownPath,
      contextPath: ref.contextPath,
      l0Path: ref.l0Path,
      l0ContextPath: ref.l0ContextPath,
    });
    emit(state, socket, {
      type: 'chart_asset_done',
      turnId,
      chartAssetId: ref.chartAssetId,
      jsonPath: ref.jsonPath,
      markdownPath: ref.markdownPath,
      contextPath: ref.contextPath,
      l0Path: ref.l0Path,
      l0ContextPath: ref.l0ContextPath,
    });
    await appendTranscript(state, `\n\n## L0 Chart Asset ${new Date().toISOString()}\n\n- chart_asset_id: ${ref.chartAssetId}\n- json: ${ref.jsonPath}\n- markdown: ${ref.markdownPath}\n- context: ${ref.contextPath}\n- l0: ${ref.l0Path}\n- l0_context: ${ref.l0ContextPath}\n`);
    return ref;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emit(state, socket, { type: 'chart_asset_error', turnId, message });
    return null;
  }
}

async function writeChartAsset(projectPath: string, asset: ChartAsset): Promise<ChartAssetRef> {
  const assetDir = path.join(projectPath, '01_命', '_chart_assets');
  await mkdir(assetDir, { recursive: true });
  const jsonPath = path.join('01_命', '_chart_assets', `${asset.chart_asset_id}.json`);
  const markdownPath = path.join('01_命', '_chart_assets', `${asset.chart_asset_id}.md`);
  const contextPath = path.join('01_命', '_chart_assets', `${asset.chart_asset_id}.context.md`);
  const latestJsonPath = path.join('01_命', '_chart_assets', 'latest.json');
  const l0Path = path.join('01_命', 'L0_排盘事实档案.md');
  const l0ContextPath = path.join('01_命', 'L0_模型事实上下文.md');
  const ref: ChartAssetRef = {
    chartAssetId: asset.chart_asset_id,
    jsonPath,
    markdownPath,
    contextPath,
    l0Path,
    l0ContextPath,
  };
  await writeFile(path.join(projectPath, jsonPath), JSON.stringify(asset, null, 2), 'utf8');
  await writeFile(path.join(projectPath, markdownPath), renderChartAssetMarkdown(asset), 'utf8');
  await writeFile(path.join(projectPath, contextPath), renderChartAssetContextMarkdown(asset), 'utf8');
  await writeFile(path.join(projectPath, latestJsonPath), JSON.stringify(ref, null, 2), 'utf8');
  await writeFile(path.join(projectPath, l0Path), renderChartAssetMarkdown(asset), 'utf8');
  await writeFile(path.join(projectPath, l0ContextPath), renderChartAssetContextMarkdown(asset), 'utf8');
  return ref;
}

async function readLatestChartAssetRef(projectPath: string): Promise<ChartAssetRef | null> {
  try {
    const raw = await readFile(path.join(projectPath, '01_命', '_chart_assets', 'latest.json'), 'utf8');
    const parsed = JSON.parse(raw) as ChartAssetRef;
    if (!parsed.chartAssetId || !parsed.jsonPath || !parsed.markdownPath || !parsed.l0Path) return null;
    parsed.contextPath ??= path.join('01_命', '_chart_assets', `${parsed.chartAssetId}.context.md`);
    parsed.l0ContextPath ??= path.join('01_命', 'L0_模型事实上下文.md');
    return parsed;
  } catch {
    return null;
  }
}

function summarizeToolEvent(event: unknown) {
  if (!event || typeof event !== 'object') return null;
  const found = findToolFields(event);
  if (!found.tool && !found.name) return null;
  return {
    tool: found.tool || found.name || 'unknown',
    status: found.status,
    title: found.title,
    at: new Date().toISOString(),
  };
}

function findToolFields(value: unknown, seen = new Set<unknown>()): { tool?: string; name?: string; status?: string; title?: string } {
  if (!value || typeof value !== 'object' || seen.has(value)) return {};
  seen.add(value);
  const item = value as Record<string, unknown>;
  const out: { tool?: string; name?: string; status?: string; title?: string } = {};
  if (typeof item.tool === 'string') out.tool = item.tool;
  if (typeof item.name === 'string' && (/tool|mcp|memory|chart|methodology|note/i.test(item.name) || item.type === 'tool_use')) out.name = item.name;
  if (typeof item.status === 'string') out.status = item.status;
  if (typeof item.title === 'string') out.title = item.title;
  for (const nested of Object.values(item)) {
    const child = findToolFields(nested, seen);
    out.tool ??= child.tool;
    out.name ??= child.name;
    out.status ??= child.status;
    out.title ??= child.title;
  }
  return out;
}

async function createRuntimeContext(
  slug: string,
  opts?: { deferBasicMemory?: boolean },
): Promise<RuntimeContext> {
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const context = await createProjectContext(slug, runId, opts);
  await writeReport(context, 'Run created.');
  return context;
}

async function createProjectContext(
  slug: string,
  runId: string,
  opts?: { deferBasicMemory?: boolean },
): Promise<RuntimeContext> {
  const projectPath = resolveInside(memoryRoot, slug);
  const basicMemory = {
    configDir: path.join(runtimeRoot, 'basic-memory', slug, 'config'),
    home: projectPath,
    fastembedCachePath: path.join(runtimeRoot, 'basic-memory', 'fastembed-cache'),
  };
  const runRoot = path.join(runtimeRoot, 'runs', slug, runId);
  // Default: defer Basic Memory CLI — read APIs (ming-reports/dashboard/status) must stay fast.
  await ensurePersonProject(slug, projectPath, basicMemory, {
    deferBasicMemory: opts?.deferBasicMemory !== false,
  });
  if (runId !== 'status') await mkdir(runRoot, { recursive: true });
  return { slug, runId, runRoot, projectPath, basicMemory };
}

async function ensurePersonProject(
  slug: string,
  projectPath: string,
  basicMemory: BasicMemoryRuntimeEnv,
  opts?: { deferBasicMemory?: boolean },
) {
  await mkdir(projectPath, { recursive: true });
  await mkdir(basicMemory.configDir, { recursive: true });
  await mkdir(basicMemory.fastembedCachePath, { recursive: true });
  for (const dir of memoryDirs) await mkdir(path.join(projectPath, dir), { recursive: true });
  await mkdir(path.join(projectPath, '01_命', '_chart_assets'), { recursive: true });
  await copyAgentSouls(projectPath);
  if (opts?.deferBasicMemory) {
    void ensureBasicMemoryProject(slug, projectPath, basicMemory).catch((err) => {
      process.stderr.write(
        `[agent-host] deferred Basic Memory setup failed for ${slug}: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    });
    return;
  }
  await ensureBasicMemoryProject(slug, projectPath, basicMemory);
}

async function ensureBasicMemoryProject(slug: string, projectPath: string, basicMemory: BasicMemoryRuntimeEnv) {
  if (await hasRegisteredBasicMemoryProject(slug, projectPath, basicMemory)) return;
  const add = await runBasicMemoryCommand(
    ['project', 'add', slug, projectPath, '--default', '--local'],
    basicMemory,
    120_000,
  );
  if (!add.ok && !/already exists|exists/i.test(add.output)) {
    throw new Error(`Basic Memory project registration failed: ${add.output || `exit ${add.exitCode}`}`);
  }
  const setDefault = await runBasicMemoryCommand(['project', 'default', slug, '--local'], basicMemory, 60_000);
  if (!setDefault.ok) {
    throw new Error(`Basic Memory default project update failed: ${setDefault.output || `exit ${setDefault.exitCode}`}`);
  }
}

async function hasRegisteredBasicMemoryProject(slug: string, projectPath: string, basicMemory: BasicMemoryRuntimeEnv) {
  try {
    const raw = await readFile(path.join(basicMemory.configDir, 'config.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      default_project?: string;
      projects?: Record<string, { path?: string; mode?: string }>;
    };
    const project = parsed.projects?.[slug];
    return parsed.default_project === slug && project?.mode === 'local' && path.resolve(project.path || '') === projectPath;
  } catch {
    return false;
  }
}

async function copyAgentSouls(projectPath: string) {
  const sourceDir = path.join(projectRoot, 'agents');
  const targetDir = path.join(projectPath, '00_soul');
  const files = await readdir(sourceDir);
  await Promise.all(files.filter((file) => file.endsWith('.md')).map(async (file) => {
    const source = await readFile(path.join(sourceDir, file), 'utf8');
    const target = path.join(targetDir, file);
    let current = '';
    try {
      current = await readFile(target, 'utf8');
    } catch {
      current = '';
    }
    if (current !== source) await writeFile(target, source, 'utf8');
  }));
}

async function readProjectStatus(context: RuntimeContext) {
  const directories = await Promise.all(memoryDirs.map(async (dir) => ({
    dir,
    files: await listMarkdownFiles(path.join(context.projectPath, dir), context.projectPath),
  })));
  const basicMemory = await probeBasicMemory(context.basicMemory);
  return {
    slug: context.slug,
    runId: context.runId,
    memoryProjectPath: context.projectPath,
    runtimeRoot,
    basicMemory,
    directories,
  };
}

async function probeBasicMemory(basicMemory: BasicMemoryRuntimeEnv) {
  const result = await runBasicMemoryCommand(['status'], basicMemory, 45_000);
  return { ok: result.ok, output: result.output };
}

async function runBasicMemoryCommand(args: string[], basicMemory: BasicMemoryRuntimeEnv, timeoutMs: number) {
  return await new Promise<{ ok: boolean; output: string; exitCode: number | null }>((resolve) => {
    const child = spawn(basicMemoryBin, args, {
      env: {
        ...process.env,
        HOME: process.env.HOME || path.join(runtimeRoot, 'home'),
        TMPDIR: process.env.TMPDIR || path.join(runtimeRoot, 'tmp'),
        XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || path.join(runtimeRoot, 'cache'),
        NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE || path.join(runtimeRoot, 'cache', 'npm'),
        npm_config_cache: process.env.npm_config_cache || path.join(runtimeRoot, 'cache', 'npm'),
        BASIC_MEMORY_CONFIG_DIR: basicMemory.configDir,
        BASIC_MEMORY_HOME: basicMemory.home,
        BASIC_MEMORY_LOG_LEVEL: process.env.BASIC_MEMORY_LOG_LEVEL || 'WARNING',
        FASTEMBED_CACHE_PATH: basicMemory.fastembedCachePath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let settled = false;
    let output = '';
    const done = (ok: boolean, exitCode: number | null, extra = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok, exitCode, output: `${output}${extra}`.trim().slice(0, 4000) });
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      done(false, null, `\nTimed out after ${timeoutMs}ms.`);
    }, timeoutMs);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', (error) => done(false, null, error.message));
    child.on('close', (code) => done(code === 0, code));
  });
}

async function snapshotMemoryProject(projectPath: string) {
  const files = await listMarkdownFiles(projectPath, projectPath);
  const snapshot: Record<string, { size: number; mtimeMs: number }> = {};
  for (const file of files) {
    const info = await stat(path.join(projectPath, file));
    snapshot[file] = { size: info.size, mtimeMs: info.mtimeMs };
  }
  return snapshot;
}

function diffSnapshots(
  before: Record<string, { size: number; mtimeMs: number }>,
  after: Record<string, { size: number; mtimeMs: number }>,
) {
  const created: string[] = [];
  const updated: string[] = [];
  for (const [file, value] of Object.entries(after)) {
    if (!before[file]) created.push(file);
    else if (before[file].size !== value.size || before[file].mtimeMs !== value.mtimeMs) updated.push(file);
  }
  return { created, updated };
}

async function listMarkdownFiles(dir: string, base: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const out: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await listMarkdownFiles(full, base));
      else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json') || entry.name.endsWith('.jsonl'))) out.push(path.relative(base, full));
    }
    return out.sort();
  } catch {
    return [];
  }
}

async function appendTurn(state: RuntimeContext, payload: Record<string, unknown>) {
  await appendJsonl(path.join(state.runRoot, 'turns.jsonl'), payload);
}

async function appendAgentEvent(state: RuntimeContext, payload: Record<string, unknown>) {
  await appendJsonl(path.join(state.runRoot, 'agent-events.jsonl'), payload);
}

async function appendToolCall(state: RuntimeContext, payload: Record<string, unknown>) {
  await appendJsonl(path.join(state.runRoot, 'tool-calls.jsonl'), payload);
}

async function appendMemoryDiff(state: RuntimeContext, agent: string, diff: { created: string[]; updated: string[] }) {
  const content = [
    `\n\n## ${new Date().toISOString()} ${agent}`,
    '',
    `Created: ${diff.created.length ? diff.created.join(', ') : 'none'}`,
    `Updated: ${diff.updated.length ? diff.updated.join(', ') : 'none'}`,
  ].join('\n');
  await appendFile(path.join(state.runRoot, 'memory-diff.md'), content, 'utf8');
}

async function appendTranscript(state: RuntimeContext, content: string) {
  await appendFile(path.join(state.runRoot, 'transcript.md'), content, 'utf8');
}

async function writeReport(state: RuntimeContext, content: string) {
  await writeFile(path.join(state.runRoot, 'report.md'), `# Run Report\n\n${content}\n`, 'utf8');
}

async function appendJsonl(file: string, payload: Record<string, unknown>) {
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify({ at: new Date().toISOString(), ...payload })}\n`, 'utf8');
}

function emit(state: RuntimeContext, socket: WebSocket, payload: Record<string, unknown>) {
  const event = { at: new Date().toISOString(), ...payload };
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(event));
  queueAgentEvent(state, event);
}

function queueAgentEvent(state: RuntimeContext, event: Record<string, unknown>) {
  const previous = eventWriteQueues.get(state.runRoot) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => appendAgentEvent(state, event))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`agent event write failed: ${message}\n`);
    });
  eventWriteQueues.set(state.runRoot, next);
}

function normalizeSlug(input: string) {
  const slug = input.trim();
  if (!slug || slug.length > 80 || slug === '.' || slug === '..' || slug.includes('/') || slug.includes('\\')) {
    throw new Error('Invalid slug.');
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(slug)) throw new Error('Invalid slug.');
  return slug;
}

function safeNoteFileName(input: string) {
  const name = input.trim().replace(/[\\/:*?"<>|]+/gu, '_').replace(/\s+/gu, '_');
  return name || 'report';
}

function normalizeMemoryProjectRel(input: string) {
  const normalized = path.normalize(input).replace(/^[/\\]+/u, '');
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith(`..${path.sep}`) || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`Invalid memory project path: ${input}`);
  }
  return normalized;
}

function tryNormalizeMemoryProjectRel(input: string) {
  try {
    return normalizeMemoryProjectRel(input);
  } catch {
    return '';
  }
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items));
}

function isSlugPath(pathname: string) {
  if (!pathname || pathname === '/' || pathname.includes('/api/') || pathname === '/ws') return false;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 1) return false;
  try {
    normalizeSlug(decodeURIComponent(parts[0]));
    return true;
  } catch {
    return false;
  }
}

function resolveInside(root: string, child: string) {
  const resolved = path.resolve(root, child);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error('Path escaped memory root.');
  }
  return resolved;
}

async function ensureRuntimeRoots() {
  await mkdir(runtimeRoot, { recursive: true });
  await mkdir(memoryRoot, { recursive: true });
  await mkdir(path.join(runtimeRoot, 'claude-code'), { recursive: true });
  await mkdir(path.join(runtimeRoot, 'logs'), { recursive: true });
  await mkdir(path.join(runtimeRoot, 'basic-memory'), { recursive: true });
}

function writeJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}
