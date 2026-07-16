import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import WebSocket from 'ws';
import {
  agentHostWsUrl,
  birthProfileToAgentPayload,
  FUXI_CORE_NODE_CODES,
  FUXI_INIT_NODES,
  userSlug,
  type AgentBirthPayload,
  type AgentInitPhase,
} from './agent.constants';
import { buildL0ChartAsset } from './chart-l0.builder';
import { planInputToBootstrapPayload, renderBootstrapPlanMarkdown, type BootstrapPlanPayload } from './bootstrap-plan';
import { AgentInitStatus, AgentInitStatusDocument } from './schemas/agent-init-status.schema';
import { AgentRun, AgentRunDocument } from './schemas/agent-run.schema';
import { ReportsService } from '../reports/reports.service';

interface AgentHostHealth {
  ok: boolean;
  service?: string;
  runtimeRoot?: string;
  memoryRoot?: string;
}

interface AgentHostProjectStatus {
  ok: boolean;
  slug?: string;
  runId?: string;
  memoryProjectPath?: string;
  directories?: Array<{ dir: string; files: string[] }>;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly initSessions = new Map<string, WebSocket>();

  constructor(
    private config: ConfigService,
    @InjectModel(AgentInitStatus.name)
    private initStatusModel: Model<AgentInitStatusDocument>,
    @InjectModel(AgentRun.name)
    private runModel: Model<AgentRunDocument>,
    private reportsService: ReportsService,
  ) {}

  get agentHostUrl(): string {
    return this.config.get<string>('AGENT_HOST_URL') ?? 'http://127.0.0.1:8787';
  }

  get agentMode(): 'legacy' | 'claude' {
    const mode = this.config.get<string>('AGENT_MODE') ?? 'legacy';
    return mode === 'claude' ? 'claude' : 'legacy';
  }

  isAgentEnabled(): boolean {
    return this.agentMode === 'claude';
  }

  fuxiInitGate(): 'core' | 'full' {
    const raw = this.config.get<string>('FUXI_INIT_GATE') ?? 'core';
    return raw.trim().toLowerCase() === 'full' ? 'full' : 'core';
  }

  private canChatFromInit(
    phase: AgentInitPhase,
    fuxiNodesDone: number,
    bootstrapReady: boolean,
  ): boolean {
    if (!this.isAgentEnabled()) return true;
    if (bootstrapReady) return true;
    // Fuxi may end as failed/partial after some nodes; still allow chat once core exists
    if (['chat_ready', 'partial', 'done', 'skipped', 'failed'].includes(phase)) {
      if (phase !== 'failed') return true;
      if (fuxiNodesDone > 0) return true;
    }
    if (phase === 'running' && fuxiNodesDone >= FUXI_CORE_NODE_CODES.length) return true;
    return false;
  }

  async hasBootstrapReports(userId: string): Promise<boolean> {
    const list = await this.reportsService.findByUser(userId);
    return list.some((r) => r.topic === 'self_profile' || r.topic === 'recent_years');
  }

  async markBootstrapReady(userId: string) {
    await this.initStatusModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        bootstrapReady: true,
        bootstrapReadyAt: new Date(),
      },
      { upsert: true },
    );
  }

  async writeBootstrapPlanToMemory(userId: string, payload: BootstrapPlanPayload) {
    const writeKey = this.config.get<string>('MEMORY_WRITE_SECRET')?.trim();
    if (!writeKey) {
      this.logger.warn('MEMORY_WRITE_SECRET missing; skip writing 01_命/_bootstrap_plan.md');
      return { ok: false, skipped: true };
    }
    const slug = this.slugForUser(userId);
    const content = renderBootstrapPlanMarkdown(payload);
    const res = await fetch(`${this.agentHostUrl}/api/${encodeURIComponent(slug)}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-memory-write-key': writeKey,
      },
      body: JSON.stringify({ rel: '01_命/_bootstrap_plan.md', content }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`bootstrap memory write failed (${res.status}): ${body}`);
    }
    return (await res.json()) as { ok: boolean };
  }

  private async resolveBootstrapReady(userId: string, record?: AgentInitStatusDocument | null) {
    if (record?.bootstrapReady) return true;
    return this.hasBootstrapReports(userId);
  }

  private buildInitStatusResponse(
    userId: string,
    slug: string,
    record: AgentInitStatusDocument | null,
    hostStatus: AgentHostProjectStatus | null,
    bootstrapReady: boolean,
  ) {
    const inferredDone = this.inferCompletedNodes(hostStatus);
    const fuxiNodesDone = Math.max(record?.fuxiNodesDone ?? 0, inferredDone.length);
    const phase = (record?.phase ?? 'pending') as AgentInitPhase;
    const nodes = FUXI_INIT_NODES.map((n) => ({
      ...n,
      done:
        (record?.completedNodeCodes.includes(n.code) ?? false) || inferredDone.includes(n.code),
    }));

    return {
      phase,
      slug: record?.slug ?? slug,
      progress: Math.round((fuxiNodesDone / FUXI_INIT_NODES.length) * 100),
      fuxiNodesDone,
      fuxiNodesTotal: record?.fuxiNodesTotal || FUXI_INIT_NODES.length,
      fuxiCoreTotal: FUXI_CORE_NODE_CODES.length,
      nodes,
      lastError: record?.lastError,
      startedAt: record?.startedAt,
      finishedAt: record?.finishedAt,
      bootstrapReady,
      agentMode: this.agentMode,
      initGate: this.fuxiInitGate(),
      canChat: this.canChatFromInit(phase, fuxiNodesDone, bootstrapReady),
      memoryReady: hostStatus?.ok === true,
    };
  }

  slugForUser(userId: string): string {
    return userSlug(userId);
  }

  async fetchHealth(): Promise<AgentHostHealth> {
    const res = await fetch(`${this.agentHostUrl}/health`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      throw new ServiceUnavailableException(`agent-host health ${res.status}`);
    }
    return (await res.json()) as AgentHostHealth;
  }

  async fetchProjectStatus(slug: string): Promise<AgentHostProjectStatus> {
    const res = await fetch(
      `${this.agentHostUrl}/api/${encodeURIComponent(slug)}/status`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) {
      throw new ServiceUnavailableException(`agent-host status ${res.status}`);
    }
    return (await res.json()) as AgentHostProjectStatus;
  }

  async getInitStatus(userId: string) {
    const slug = this.slugForUser(userId);
    const record = await this.initStatusModel.findOne({ userId: new Types.ObjectId(userId) });
    const bootstrapReady = await this.resolveBootstrapReady(userId, record);

    let hostStatus: AgentHostProjectStatus | null = null;
    try {
      hostStatus = await this.fetchProjectStatus(slug);
    } catch (err) {
      this.logger.warn(`agent-host status unavailable for ${slug}: ${String(err)}`);
    }

    return this.buildInitStatusResponse(userId, slug, record, hostStatus, bootstrapReady);
  }

  async fetchTranscript(userId: string, limit = 50) {
    const slug = this.slugForUser(userId);
    const res = await fetch(
      `${this.agentHostUrl}/api/${encodeURIComponent(slug)}/transcript?limit=${limit}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) {
      throw new ServiceUnavailableException(`agent-host transcript ${res.status}`);
    }
    return res.json();
  }

  async scheduleInit(
    userId: string,
    profile: {
      gender: string;
      birthDate: string;
      birthTime: string;
      birthPlace?: string;
      timeUnknown?: boolean;
      calendar?: string;
      isLeapMonth?: boolean;
      longitude?: number;
    },
  ) {
    if (!this.isAgentEnabled()) {
      this.logger.debug(`AGENT_MODE=legacy, skip init for ${userId}`);
      return { scheduled: false, reason: 'legacy_mode' };
    }

    const slug = this.slugForUser(userId);
    const birthPayload = birthProfileToAgentPayload(profile);

    await this.initStatusModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        userId: new Types.ObjectId(userId),
        slug,
        phase: 'pending',
        birthPayload,
        fuxiNodesTotal: FUXI_INIT_NODES.length,
        fuxiNodesDone: 0,
        completedNodeCodes: [],
        lastError: undefined,
        startedAt: undefined,
        finishedAt: undefined,
      },
      { upsert: true, new: true },
    );

    void this.runInitSession(userId, slug, birthPayload).catch((err) => {
      this.logger.error(`init session failed for ${slug}: ${String(err)}`);
    });

    return { scheduled: true, slug };
  }

  async retryInit(userId: string) {
    const record = await this.initStatusModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!record?.birthPayload) {
      throw new ServiceUnavailableException('缺少出生档案，请先完成建档');
    }
    const birthPayload = record.birthPayload as unknown as AgentBirthPayload;
    await this.initStatusModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { phase: 'running', lastError: undefined, startedAt: new Date(), finishedAt: undefined },
    );
    void this.runInitSession(userId, record.slug, birthPayload).catch((err) => {
      this.logger.error(`retry init failed for ${record.slug}: ${String(err)}`);
    });
    return { ok: true, slug: record.slug };
  }

  private inferCompletedNodes(status: AgentHostProjectStatus | null): string[] {
    if (!status?.directories?.length) return [];
    const mingFiles = status.directories.find((d) => d.dir.includes('01_命'))?.files ?? [];
    const codes: string[] = [];
    for (const node of FUXI_INIT_NODES) {
      const hit = mingFiles.some(
        (f) => f.includes(node.code) || f.includes(node.title),
      );
      if (hit) codes.push(node.code);
    }
    return codes;
  }

  private async runInitSession(userId: string, slug: string, birthPayload: AgentBirthPayload) {
    if (this.initSessions.has(userId)) {
      this.logger.debug(`init session already active for ${slug}`);
      return;
    }

    await this.initStatusModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { phase: 'running', startedAt: new Date(), slug },
    );

    const wsUrl = agentHostWsUrl(this.agentHostUrl, slug);
    const ws = new WebSocket(wsUrl);
    this.initSessions.set(userId, ws);

    let runId = '';
    const completedCodes = new Set<string>();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('init session timeout (30min)'));
      }, 30 * 60 * 1000);

      ws.on('open', () => {
        const chartAsset = buildL0ChartAsset(slug, birthPayload);
        ws.send(
          JSON.stringify({
            type: 'start',
            ...birthPayload,
            chartAsset,
          }),
        );
      });

      ws.on('message', (raw) => {
        try {
          const event = JSON.parse(String(raw)) as Record<string, unknown>;
          if (event.type === 'connected' && typeof event.runId === 'string') {
            runId = event.runId;
          }
          if (event.type === 'fuxi_node_done' || event.type === 'fuxi_node_reused') {
            const code = typeof event.nodeCode === 'string' ? event.nodeCode : typeof event.code === 'string' ? event.code : '';
            if (code) completedCodes.add(code);
            void this.initStatusModel.updateOne(
              { userId: new Types.ObjectId(userId) },
              {
                fuxiNodesDone: completedCodes.size,
                completedNodeCodes: Array.from(completedCodes),
                lastRunId: runId,
              },
            );
          }
          if (event.type === 'fuxi_init_chat_ready') {
            void this.initStatusModel.updateOne(
              { userId: new Types.ObjectId(userId) },
              {
                phase: 'chat_ready',
                fuxiNodesDone: Math.max(completedCodes.size, FUXI_CORE_NODE_CODES.length),
                completedNodeCodes: Array.from(completedCodes),
                lastRunId: runId,
              },
            );
          }
          if (event.type === 'fuxi_init_done') {
            clearTimeout(timeout);
            const failed = Number(event.failed) || 0;
            const skipped = Number(event.skipped) || 0;
            const coreReady = FUXI_CORE_NODE_CODES.every((code) => completedCodes.has(code));
            const phase: AgentInitPhase =
              failed > 0 || skipped > 0
                ? coreReady && this.fuxiInitGate() === 'core'
                  ? 'partial'
                  : 'failed'
                : 'done';
            const msg =
              phase === 'partial'
                ? typeof event.message === 'string'
                  ? event.message
                  : `${failed} background node(s) failed`
                : phase === 'failed'
                  ? typeof event.message === 'string'
                    ? event.message
                    : String(event.type)
                  : undefined;
            void this.finishInit(userId, slug, runId, phase, completedCodes, msg);
            ws.close();
            if (phase === 'failed') reject(new Error(msg || 'fuxi init failed'));
            else resolve();
          }
          if (event.type === 'fuxi_init_partial') {
            const msg = typeof event.message === 'string' ? event.message : String(event.type);
            void this.initStatusModel.updateOne(
              { userId: new Types.ObjectId(userId) },
              { phase: 'partial', lastError: msg, finishedAt: new Date(), lastRunId: runId },
            );
          }
          if (event.type === 'fuxi_init_failed' || event.type === 'fuxi_init_aborted') {
            clearTimeout(timeout);
            const msg = typeof event.message === 'string' ? event.message : String(event.type);
            void this.finishInit(userId, slug, runId, 'failed', completedCodes, msg);
            ws.close();
            reject(new Error(msg));
          }
        } catch (err) {
          this.logger.warn(`init ws parse error: ${String(err)}`);
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      ws.on('close', () => {
        this.initSessions.delete(userId);
      });
    }).catch(async (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      await this.finishInit(userId, slug, runId, 'failed', completedCodes, msg);
      throw err;
    });
  }

  private async finishInit(
    userId: string,
    slug: string,
    runId: string,
    phase: AgentInitPhase,
    completedCodes: Set<string>,
    lastError?: string,
  ) {
    await this.initStatusModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      {
        phase,
        fuxiNodesDone: completedCodes.size,
        completedNodeCodes: Array.from(completedCodes),
        finishedAt: new Date(),
        lastError,
        lastRunId: runId || undefined,
      },
    );
    if (runId) {
      await this.runModel.findOneAndUpdate(
        { userId: new Types.ObjectId(userId), runId },
        {
          userId: new Types.ObjectId(userId),
          slug,
          runId,
          kind: 'init',
          endedAt: new Date(),
          meta: { phase, completed: completedCodes.size },
        },
        { upsert: true },
      );
    }
  }
}
