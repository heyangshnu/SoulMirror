import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { terminologyStrip, terminologyStripDeep } from '../common/terminology-strip';
import { userSlug } from '../agent/agent.constants';
import { MemoryIndexCache, MemoryIndexCacheDocument } from './schemas/memory-index-cache.schema';

const CACHE_TTL_MS = 60_000;

@Injectable()
export class MemoryService {
  constructor(
    private config: ConfigService,
    @InjectModel(MemoryIndexCache.name)
    private cacheModel: Model<MemoryIndexCacheDocument>,
  ) {}

  private get baseUrl() {
    return this.config.get<string>('AGENT_HOST_URL') ?? 'http://127.0.0.1:8787';
  }

  private slug(userId: string) {
    return userSlug(userId);
  }

  private noteIdToRel(noteId: string) {
    return noteId.replace(/__/g, '/');
  }

  private async fetchAgent<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(30_000),
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new ServiceUnavailableException(`agent-host ${path} → ${res.status}`);
    }
    return (await res.json()) as T;
  }

  private async cached<T>(userId: string, key: string, loader: () => Promise<T>): Promise<T> {
    const hit = await this.cacheModel.findOne({
      userId: new Types.ObjectId(userId),
      cacheKey: key,
      expiresAt: { $gt: new Date() },
    });
    if (hit?.payload) return hit.payload as T;
    const payload = await loader();
    await this.cacheModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), cacheKey: key },
      {
        userId: new Types.ObjectId(userId),
        cacheKey: key,
        payload: payload as Record<string, unknown>,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
      { upsert: true },
    );
    return payload;
  }

  async invalidateCache(userId: string, prefix?: string) {
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (prefix) filter.cacheKey = { $regex: `^${prefix}` };
    await this.cacheModel.deleteMany(filter);
  }

  async getDashboard(userId: string) {
    return this.cached(userId, 'dashboard', async () => {
      const slug = this.slug(userId);
      const data = await this.fetchAgent<{
        dashboard: Record<string, { summary: string; fileCount: number; recent: string[] }>;
        currentTopic?: { id: string; title: string; summary?: string; domain: string; excerpt: string } | null;
      }>(`/api/${encodeURIComponent(slug)}/dashboard`);
      const d = data.dashboard;
      return terminologyStripDeep({
        ming: { ...d.ming, label: '命' },
        yuan: { ...d.yuan, label: '愿' },
        jing: { ...d.jing, label: '境' },
        yuanRel: { ...d.yuan_rel, label: '缘' },
        li: { ...d.li, label: '力' },
        currentTopic: data.currentTopic
          ? {
              ...data.currentTopic,
              title: terminologyStrip(data.currentTopic.title),
              summary: terminologyStrip(data.currentTopic.summary ?? data.currentTopic.excerpt),
            }
          : null,
      });
    });
  }

  async getCurrentTopic(userId: string) {
    const slug = this.slug(userId);
    const data = await this.fetchAgent<{ topic: { id: string; title: string; summary?: string; domain: string; excerpt: string } | null }>(
      `/api/${encodeURIComponent(slug)}/current-topic`,
    );
    if (!data.topic) return null;
    return terminologyStripDeep({
      ...data.topic,
      title: terminologyStrip(data.topic.title),
      summary: terminologyStrip(data.topic.summary ?? data.topic.excerpt),
    });
  }

  async getRecentActivity(userId: string, limit = 8) {
    const slug = this.slug(userId);
    const data = await this.fetchAgent<{ items: Array<{ id: string; title: string; domain: string; excerpt: string; updatedAt?: string }> }>(
      `/api/${encodeURIComponent(slug)}/recent-activity?limit=${limit}`,
    );
    return terminologyStripDeep(
      data.items.map((item) => ({
        ...item,
        title: terminologyStrip(item.title),
        excerpt: terminologyStrip(item.excerpt),
      })),
    );
  }

  async getDomain(userId: string, domain: string) {
    const slug = this.slug(userId);
    const data = await this.fetchAgent<{ domain: Record<string, unknown> }>(
      `/api/${encodeURIComponent(slug)}/domain/${encodeURIComponent(domain)}`,
    );
    return terminologyStripDeep(data.domain);
  }

  async getTopics(userId: string, status?: string) {
    return this.cached(userId, `topics:${status ?? 'all'}`, async () => {
      const slug = this.slug(userId);
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await this.fetchAgent<{ topics: Array<{ id: string; title: string; domain: string; status: string; excerpt: string; updatedAt?: string }> }>(
        `/api/${encodeURIComponent(slug)}/topics${q}`,
      );
      return terminologyStripDeep(
        data.topics.map((t) => ({
          ...t,
          title: terminologyStrip(t.title),
          excerpt: terminologyStrip(t.excerpt),
        })),
      );
    });
  }

  async getTopic(userId: string, noteId: string) {
    const slug = this.slug(userId);
    const data = await this.fetchAgent<{
      topic: {
        id: string;
        title: string;
        summary: string;
        body: string;
        evidence: Array<{ kind: string; text: string }>;
        insights?: string;
        nextSteps?: string;
        history?: string;
        status?: string;
        domain?: string;
      };
    }>(`/api/${encodeURIComponent(slug)}/topics/${encodeURIComponent(noteId)}`);
    const t = data.topic;
    return terminologyStripDeep({
      id: t.id,
      title: terminologyStrip(t.title),
      summary: terminologyStrip(t.summary),
      body: terminologyStrip(t.body),
      evidence: t.evidence?.map((e) => ({ kind: e.kind, text: terminologyStrip(e.text) })) ?? [],
      insights: terminologyStrip(t.insights ?? ''),
      nextSteps: terminologyStrip(t.nextSteps ?? ''),
      history: terminologyStrip(t.history ?? ''),
      status: t.status,
      domain: t.domain,
    });
  }

  async getPending(userId: string) {
    const slug = this.slug(userId);
    const data = await this.fetchAgent<{ items: Array<{ id: string; rel: string; domain: string; excerpt: string; title: string }> }>(
      `/api/${encodeURIComponent(slug)}/pending`,
    );
    return terminologyStripDeep(data.items);
  }

  async confirm(userId: string, noteId: string, action: 'confirm' | 'reject') {
    const slug = this.slug(userId);
    const rel = this.noteIdToRel(noteId);
    const result = await this.fetchAgent(`/api/${encodeURIComponent(slug)}/memory/confirm`, {
      method: 'POST',
      body: JSON.stringify({ rel, action }),
    });
    await this.invalidateCache(userId);
    return result;
  }

  async getEvent(userId: string, eventId: string) {
    const slug = this.slug(userId);
    const data = await this.fetchAgent<{
      event: {
        id: string;
        summary: string;
        axes: Array<{ domain: string; title: string; excerpt: string; topicId?: string }>;
      };
    }>(`/api/${encodeURIComponent(slug)}/events?id=${encodeURIComponent(eventId)}`);
    return terminologyStripDeep({
      ...data.event,
      summary: terminologyStrip(data.event.summary),
      axes: data.event.axes.map((a) => ({
        ...a,
        title: terminologyStrip(a.title),
        excerpt: terminologyStrip(a.excerpt),
      })),
    });
  }

  async getMingReports(userId: string) {
    const slug = this.slug(userId);
    const data = await this.fetchAgent<{ reports: Array<{ code: string; title: string; rel: string }> }>(
      `/api/${encodeURIComponent(slug)}/ming-reports`,
    );
    return terminologyStripDeep(
      data.reports.map((r) => ({ ...r, title: terminologyStrip(r.title) })),
    );
  }

  async getMingReport(userId: string, code: string, rel?: string) {
    const slug = this.slug(userId);
    if (rel) {
      const file = await this.fetchAgent<{ content: string }>(
        `/api/${encodeURIComponent(slug)}/file?rel=${encodeURIComponent(rel)}`,
      );
      const reports = await this.getMingReports(userId);
      const hit = reports.find((r) => r.rel === rel);
      return {
        code: hit?.code ?? code,
        title: hit?.title ?? code,
        body: terminologyStrip(file.content.replace(/^---[\s\S]*?---\n/m, '')),
      };
    }
    const reports = await this.getMingReports(userId);
    const hit = reports.find((r) => r.code === code);
    if (!hit) throw new NotFoundException('report not found');
    const file = await this.fetchAgent<{ content: string }>(
      `/api/${encodeURIComponent(slug)}/file?rel=${encodeURIComponent(hit.rel)}`,
    );
    return {
      code,
      title: hit.title,
      body: terminologyStrip(file.content.replace(/^---[\s\S]*?---\n/m, '')),
    };
  }
}
