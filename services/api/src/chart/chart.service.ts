import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  buildChartContextText,
  buildFlyingStarAppendix,
  buildHoroscope,
  buildNatalChart,
  type BirthInput,
} from '@soulmirror/chart';
import { buildBaziSummary } from '@soulmirror/bazi';
import { Model, Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { AgentService } from '../agent/agent.service';
import { BotSession, BotSessionDocument } from '../schemas/bot-session.schema';
import { BirthProfile, BirthProfileDocument } from '../schemas/birth-profile.schema';
import { LifeContext, LifeContextDocument } from '../schemas/life-context.schema';
import { RelationProfile, RelationProfileDocument } from '../schemas/relation-profile.schema';
import { ReportsService, type PlanReportInput } from '../reports/reports.service';
import { planInputToBootstrapPayload } from '../agent/bootstrap-plan';
import { UsersService } from '../users/users.service';
import type { UpsertBirthProfileDto, CreateRelationDto } from './dto/chart.dto';

const MAX_RELATIONS = 6;

@Injectable()
export class ChartService {
  private readonly logger = new Logger(ChartService.name);
  /** 同一关系人并发生成报告时复用同一 Promise，避免重复创建 */
  private relationReportTasks = new Map<string, Promise<unknown>>();

  constructor(
    @InjectModel(BirthProfile.name) private birthModel: Model<BirthProfileDocument>,
    @InjectModel(RelationProfile.name) private relationModel: Model<RelationProfileDocument>,
    @InjectModel(LifeContext.name) private lifeModel: Model<LifeContextDocument>,
    @InjectModel(BotSession.name) private sessionModel: Model<BotSessionDocument>,
    private ai: AiService,
    private reports: ReportsService,
    private users: UsersService,
    private agentService: AgentService,
  ) {}

  private toBirthInput(p: BirthProfile | RelationProfile): BirthInput {
    return {
      birthDate: p.birthDate,
      birthTime: p.birthTime,
      gender: p.gender as 'male' | 'female',
      calendar: (p.calendar as 'solar' | 'lunar') ?? 'solar',
      isLeapMonth: 'isLeapMonth' in p ? p.isLeapMonth : false,
      birthPlace: p.birthPlace,
      longitude: 'longitude' in p ? p.longitude : undefined,
      timeUnknown: p.timeUnknown,
    };
  }

  async upsertBirthProfile(userId: string, dto: UpsertBirthProfileDto) {
    const input: BirthInput = {
      birthDate: dto.birthDate,
      birthTime: dto.birthTime,
      gender: dto.gender,
      calendar: dto.calendar,
      isLeapMonth: dto.isLeapMonth,
      birthPlace: dto.birthPlace,
      longitude: dto.longitude,
      timeUnknown: dto.timeUnknown,
    };
    let natal;
    try {
      natal = buildNatalChart(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`排盘失败：${msg}（请确认服务器已执行 npm run chart:build）`);
    }
    const profile = await this.birthModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        userId: new Types.ObjectId(userId),
        birthDate: dto.birthDate,
        birthTime: dto.birthTime,
        gender: dto.gender,
        calendar: dto.calendar,
        isLeapMonth: dto.isLeapMonth,
        birthPlace: dto.birthPlace,
        longitude: dto.longitude,
        timeUnknown: dto.timeUnknown,
        natalSummary: natal as unknown as Record<string, unknown>,
        algorithmVersion: natal.algorithmVersion,
      },
      { upsert: true, new: true },
    );
    if (dto.currentState !== undefined || dto.focusDirection !== undefined) {
      await this.lifeModel.findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        {
          $set: {
            ...(dto.currentState !== undefined ? { currentState: dto.currentState } : {}),
            ...(dto.focusDirection !== undefined ? { focusDirection: dto.focusDirection } : {}),
          },
        },
        { upsert: true },
      );
    }
    await this.syncUserChartContext(userId);
    void this.agentService.scheduleInit(userId, {
      gender: dto.gender,
      birthDate: dto.birthDate,
      birthTime: dto.birthTime,
      birthPlace: dto.birthPlace,
      timeUnknown: dto.timeUnknown,
      calendar: dto.calendar,
      isLeapMonth: dto.isLeapMonth,
      longitude: dto.longitude,
    });
    void this.generateBootstrapPlans(userId).catch((err) => {
      this.logger.warn(`bootstrap plans failed for ${userId}: ${String(err)}`);
    });
    return {
      ok: true,
      warning: natal.timeUnknown ? '时辰未知，结果可能不够准确' : undefined,
    };
  }

  async getBirthProfile(userId: string) {
    const profile = await this.birthModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!profile) return null;
    const natal = buildNatalChart(this.toBirthInput(profile));
    return { profile, natal };
  }

  async getHoroscope(userId: string, year?: number) {
    const profile = await this.requireBirthProfile(userId);
    const horoscope = buildHoroscope(this.toBirthInput(profile), year);
    return horoscope;
  }

  async generateNatalReport(userId: string) {
    const profile = await this.requireBirthProfile(userId);
    const input = this.toBirthInput(profile);
    let natal;
    try {
      natal = buildNatalChart(input);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`排盘失败：${msg}（请确认服务器已执行 npm run chart:build）`);
    }
    const life = await this.getLifeContext(userId);
    const payload = await this.ai.post<ReportPayload>('/ziwei/natal-report', {
      natal,
      lifeContext: life,
      tone: 'healing',
    });
    const report = await this.reports.create(userId, { ...payload, testType: 'ziwei_natal', raw: { natal } });
    const headline = payload.headlineSummary ?? payload.summary;
    await this.users.setTestSummary(userId, headline);
    await this.users.updateMatchProfile(userId, {
      scores: { ziwei_natal: 75 },
    });
    return this.toCreatedReport(report);
  }

  async generateDaxianReport(userId: string) {
    const profile = await this.requireBirthProfile(userId);
    const input = this.toBirthInput(profile);
    const natal = buildNatalChart(input);
    const horoscope = buildHoroscope(input);
    const personalContext = this.formatPersonalContext(await this.getLifeContext(userId));
    const payload = await this.ai.post<ReportPayload>('/ziwei/daxian-report', {
      natal,
      horoscope,
      personalContext,
    });
    const report = await this.reports.create(userId, { ...payload, testType: 'ziwei_daxian', raw: { horoscope } });
    await this.users.setTestSummary(userId, payload.headlineSummary ?? payload.summary);
    return this.toCreatedReport(report);
  }

  async generateLiunianReport(userId: string, year?: number) {
    const profile = await this.requireBirthProfile(userId);
    const input = this.toBirthInput(profile);
    const natal = buildNatalChart(input);
    const y = year ?? new Date().getFullYear();
    const horoscope = buildHoroscope(input, y);
    const flyingStar = buildFlyingStarAppendix(input, y);
    const personalContext = this.formatPersonalContext(await this.getLifeContext(userId));
    const payload = await this.ai.post<ReportPayload>('/ziwei/liunian-report', {
      natal,
      horoscope,
      flyingStar,
      year: y,
      personalContext,
    });
    const report = await this.reports.create(userId, {
      ...payload,
      testType: 'ziwei_liunian',
      raw: { horoscope, flyingStar, year: y },
    });
    await this.users.setTestSummary(userId, payload.headlineSummary ?? payload.summary);
    return this.toCreatedReport(report);
  }

  async listRelations(userId: string) {
    return this.relationModel.find({ userId: new Types.ObjectId(userId) }).exec();
  }

  async getRelation(userId: string, relationId: string) {
    const doc = await this.relationModel.findOne({
      _id: new Types.ObjectId(relationId),
      userId: new Types.ObjectId(userId),
    });
    if (!doc) throw new NotFoundException('relation not found');
    return doc;
  }

  async addRelation(userId: string, dto: CreateRelationDto) {
    const count = await this.relationModel.countDocuments({ userId: new Types.ObjectId(userId) });
    if (count >= MAX_RELATIONS) throw new BadRequestException(`关系人最多 ${MAX_RELATIONS} 人`);
    const input: BirthInput = {
      birthDate: dto.birthDate,
      birthTime: dto.birthTime,
      gender: dto.gender,
      calendar: 'solar',
      birthPlace: dto.birthPlace,
      timeUnknown: dto.timeUnknown,
    };
    const natal = buildNatalChart(input);
    return this.relationModel.create({
      userId: new Types.ObjectId(userId),
      ...dto,
      natalSummary: natal as unknown as Record<string, unknown>,
    });
  }

  async deleteRelation(userId: string, relationId: string) {
    await this.relationModel.deleteOne({
      _id: relationId,
      userId: new Types.ObjectId(userId),
    });
    return { success: true };
  }

  async generateRelationReport(userId: string, relationId: string) {
    const key = `${userId}:${relationId}`;
    const inflight = this.relationReportTasks.get(key);
    if (inflight) return inflight;

    const task = this.createRelationReport(userId, relationId);
    this.relationReportTasks.set(key, task);
    try {
      return await task;
    } finally {
      this.relationReportTasks.delete(key);
    }
  }

  private async createRelationReport(userId: string, relationId: string) {
    const profile = await this.requireBirthProfile(userId);
    const relation = await this.relationModel.findOne({
      _id: relationId,
      userId: new Types.ObjectId(userId),
    });
    if (!relation) throw new NotFoundException('关系人不存在');

    const ownerNatal = buildNatalChart(this.toBirthInput(profile));
    const targetNatal = buildNatalChart(this.toBirthInput(relation));
    const flyingStar = buildFlyingStarAppendix(this.toBirthInput(profile));
    const personalContext = this.formatPersonalContext(await this.getLifeContext(userId));
    const payload = await this.ai.post<ReportPayload>('/ziwei/relation-report', {
      ownerNatal,
      targetNatal,
      relationType: relation.relationType,
      relationName: relation.name,
      flyingStar,
      personalContext,
    });
    const report = await this.reports.create(userId, {
      ...payload,
      testType: 'ziwei_relation',
      raw: { relationId, relationType: relation.relationType },
    });
    return this.toCreatedReport(report);
  }

  async getReportHub(userId: string, year?: number) {
    const y = year ?? new Date().getFullYear();
    const [natal, daxian, liunianReport, horoscope, life] = await Promise.all([
      this.reports.findLatestByTypes(userId, ['ziwei_natal']).then((r) => r[0]),
      this.reports.findLatestByTypes(userId, ['ziwei_daxian']).then((r) => r[0]),
      this.reports.findLatestLiunian(userId, y),
      this.getHoroscope(userId, y).catch(() => null),
      this.getLifeContext(userId),
    ]);
    return {
      horoscope,
      lifeContext: life,
      natal: natal ? this.toReportCard(natal) : null,
      daxian: daxian ? this.toReportCard(daxian) : null,
      liunian: liunianReport ? this.toReportCard(liunianReport) : null,
      year: y,
    };
  }

  private toCreatedReport(report: { _id: { toString(): string }; title: string; testType: string }) {
    return {
      _id: report._id.toString(),
      title: report.title,
      testType: report.testType,
    };
  }

  private toReportCard(report: {
    _id: { toString(): string };
    title: string;
    themeLabel?: string;
    headlineSummary?: string;
    summary: string;
    testType: string;
    createdAt?: Date;
  }) {
    return {
      _id: report._id.toString(),
      title: report.title,
      themeLabel: report.themeLabel,
      headlineSummary: report.headlineSummary ?? report.summary,
      testType: report.testType,
      createdAt: report.createdAt,
    };
  }

  private formatPersonalContext(life: LifeContextDocument | null) {
    if (!life) return undefined;
    const parts: string[] = [];
    if (life.currentState?.trim()) parts.push(`当前状态：${life.currentState.trim()}`);
    if (life.focusDirection?.trim()) parts.push(`想测算的方向：${life.focusDirection.trim()}`);
    return parts.length ? parts.join('\n') : undefined;
  }

  async getLifeContext(userId: string) {
    return this.lifeModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async setWeeklyFocus(userId: string, focus: string) {
    await this.lifeModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { weeklyFocus: focus },
      { upsert: true },
    );
    await this.syncUserChartContext(userId);
    return { success: true };
  }

  async addVoiceDiary(userId: string, text: string) {
    const doc = await this.lifeModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $push: { voiceDiaryEntries: { $each: [text], $slice: -30 } } },
      { upsert: true, new: true },
    );
    await this.syncUserChartContext(userId);
    return doc;
  }

  async transcribeAndSaveVoice(userId: string, text?: string, audioBase64?: string) {
    let content = text?.trim();
    if (!content && audioBase64) {
      const res = await this.ai.post<{ text: string }>('/voice/transcribe', { audioBase64 });
      content = res.text;
    }
    if (!content) throw new BadRequestException('请提供文字或语音');
    return this.addVoiceDiary(userId, content);
  }

  async refreshChatSummary(userId: string) {
    const session = await this.sessionModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();
    const messages =
      session?.messages?.slice(-30).map((m) => ({ role: m.role, content: m.content })) ?? [];
    const summary = await this.ai.post<{ summary: string }>('/ziwei/summarize-chat', { messages });
    await this.lifeModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { chatSummary: summary.summary, lastChatSummaryAt: new Date() },
      { upsert: true },
    );
    await this.syncUserChartContext(userId);
    return summary;
  }

  async getLatestReportSummariesForBot(userId: string): Promise<string> {
    const [natal, planSelf, planRecent, latestAny] = await Promise.all([
      this.reports.findLatestByTypes(userId, ['ziwei_natal']).then((r) => r[0]),
      this.reports.findLatestByTypes(userId, ['plan_self_profile']).then((r) => r[0]),
      this.reports.findLatestByTypes(userId, ['plan_recent_years']).then((r) => r[0]),
      this.reports.findByUser(userId).then((list) => list[0]),
    ]);

    const life = await this.getLifeContext(userId);
    const lines: string[] = [];

    if (life?.currentState?.trim()) lines.push(`用户当前状态：${life.currentState.trim()}`);
    if (life?.focusDirection?.trim()) lines.push(`用户关注方向：${life.focusDirection.trim()}`);

    const pushPlan = (
      label: string,
      report?: {
        portrait?: string;
        stage?: string;
        plans?: { title: string; body: string }[];
        headlineSummary?: string;
        summary?: string;
      } | null,
    ) => {
      if (!report) return;
      const text = report.portrait?.trim() || report.headlineSummary?.trim() || report.summary?.trim();
      if (text) lines.push(`${label}：${text}`);
      if (report.stage) lines.push(`${label}阶段：${report.stage}`);
      const plans = report.plans ?? [];
      if (plans.length > 0) {
        const snippets = plans
          .slice(0, 2)
          .map((p) => `${p.title}：${p.body.slice(0, 50)}`)
          .join('；');
        lines.push(`${label}方案：${snippets}`);
      }
    };

    pushPlan('底色方案', planSelf);
    pushPlan('近几年方案', planRecent);

    const pushReport = (
      label: string,
      report?: {
        headlineSummary?: string;
        summary?: string;
        title?: string;
        sections?: { title: string; content: string }[];
      } | null,
    ) => {
      if (!report) return;
      const text = report.headlineSummary?.trim() || report.summary?.trim();
      if (text) lines.push(`${label}：${text}`);
      const sections = report.sections ?? [];
      if (sections.length > 0) {
        const snippets = sections
          .slice(0, 3)
          .map((s) => `${s.title}：${s.content.slice(0, 60).replace(/\s+/g, '')}`)
          .join('；');
        lines.push(`${label}要点：${snippets}`);
      }
    };

    pushReport('本命解读总结', natal);

    if (
      latestAny &&
      latestAny.testType?.startsWith('plan_') &&
      latestAny._id.toString() !== planSelf?._id.toString()
    ) {
      pushPlan(`近期${latestAny.title}`, latestAny);
    }

    return lines.join('\n');
  }

  async getChartContextForBot(userId: string): Promise<string> {
    const profile = await this.birthModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!profile) return '';
    const natal = buildNatalChart(this.toBirthInput(profile));
    const horoscope = buildHoroscope(this.toBirthInput(profile));
    const life = await this.getLifeContext(userId);
    let ctx = buildChartContextText(natal, horoscope);
    if (life?.chatSummary) ctx += `\n【近期聊天摘要】${life.chatSummary}`;
    if (life?.currentState) ctx += `\n【当前状态】${life.currentState}`;
    if (life?.focusDirection) ctx += `\n【测算方向】${life.focusDirection}`;
    if (life?.weeklyFocus) ctx += `\n【本周焦点】${life.weeklyFocus}`;
    if (life?.voiceDiaryEntries?.length) {
      ctx += `\n【语音日记】${life.voiceDiaryEntries.slice(-3).join('；')}`;
    }
    return ctx;
  }

  async getAnalysisInput(userId: string) {
    const profile = await this.requireBirthProfile(userId);
    const input = this.toBirthInput(profile);
    const natal = buildNatalChart(input);
    const bazi = buildBaziSummary(natal.pillars);
    const life = await this.getLifeContext(userId);
    return {
      natal: natal as unknown as Record<string, unknown>,
      bazi: bazi as unknown as Record<string, unknown>,
      realContext: this.formatRealContext(life),
    };
  }

  /** v4 快轨：建档后并行生成「底色 + 近几年」方案，不阻塞 Archive 慢轨 init */
  private async generateBootstrapPlans(userId: string) {
    if (!this.agentService.isAgentEnabled()) return;
    const existing = await this.reports.findByUser(userId);
    const hasBootstrap = existing.some(
      (r) => r.topic === 'self_profile' || r.topic === 'recent_years',
    );
    if (hasBootstrap) {
      await this.agentService.markBootstrapReady(userId);
      return;
    }
    const { natal, bazi, realContext } = await this.getAnalysisInput(userId);
    const profile = await this.requireBirthProfile(userId);
    const horoscope = buildHoroscope(this.toBirthInput(profile));
    const [natalPayload, recentPayload] = await Promise.all([
      this.ai.post<PlanReportInput>('/analysis/natal', { natal, bazi, realContext, topic: 'self_profile' }),
      this.ai.post<PlanReportInput>('/analysis/recent-years', { natal, bazi, realContext, horoscope }),
    ]);
    await Promise.all([
      this.reports.createPlan(userId, natalPayload, 'self_profile'),
      this.reports.createPlan(userId, recentPayload, 'recent_years'),
    ]);
    if (natalPayload.portrait || natalPayload.summary) {
      await this.users.setTestSummary(userId, natalPayload.portrait ?? natalPayload.summary);
    }
    const bootstrapPayload = planInputToBootstrapPayload(natalPayload, recentPayload);
    await this.agentService.markBootstrapReady(userId);
    await this.agentService.writeBootstrapPlanToMemory(userId, bootstrapPayload);
  }

  async getSynastryContext(userId: string, relationId: string) {
    const profile = await this.requireBirthProfile(userId);
    const relation = await this.relationModel.findOne({
      _id: relationId,
      userId: new Types.ObjectId(userId),
    });
    if (!relation) throw new NotFoundException('关系人不存在');
    const ownerNatal = buildNatalChart(this.toBirthInput(profile));
    const targetNatal = buildNatalChart(this.toBirthInput(relation));
    const horoscope = buildHoroscope(this.toBirthInput(profile));
    const life = await this.getLifeContext(userId);
    return {
      natal: targetNatal as unknown as Record<string, unknown>,
      ownerNatal: ownerNatal as unknown as Record<string, unknown>,
      horoscope,
      realContext: this.formatRealContext(life),
      relationName: relation.name,
    };
  }

  async getChildContext(userId: string, relationId: string) {
    const relation = await this.relationModel.findOne({
      _id: relationId,
      userId: new Types.ObjectId(userId),
    });
    if (!relation) throw new NotFoundException('关系人不存在');
    if (relation.relationType !== 'child') {
      throw new BadRequestException('请选择子女关系人');
    }
    const profile = await this.requireBirthProfile(userId);
    const childNatal = buildNatalChart(this.toBirthInput(relation));
    const life = await this.getLifeContext(userId);
    return {
      natal: childNatal as unknown as Record<string, unknown>,
      ownerNatal: buildNatalChart(this.toBirthInput(profile)),
      realContext: this.formatRealContext(life),
      relationName: relation.name,
    };
  }

  async getFamilySystemContext(userId: string) {
    const profile = await this.requireBirthProfile(userId);
    const relations = await this.relationModel.find({ userId: new Types.ObjectId(userId) });
    const spouse = relations.find((r) => r.relationType === 'spouse');
    const child = relations.find((r) => r.relationType === 'child');
    if (!spouse && !child) {
      throw new BadRequestException('请先添加配偶或子女关系人，再生成家庭系统方案');
    }
    const ownerNatal = buildNatalChart(this.toBirthInput(profile));
    const horoscope = buildHoroscope(this.toBirthInput(profile));
    const life = await this.getLifeContext(userId);
    const realContext = {
      ...this.formatRealContext(life),
      hasChildren: !!child || life?.hasChildren,
      childAge: life?.childAge,
    };
    return {
      natal: ownerNatal as unknown as Record<string, unknown>,
      ownerNatal: ownerNatal as unknown as Record<string, unknown>,
      partnerNatal: spouse
        ? (buildNatalChart(this.toBirthInput(spouse)) as unknown as Record<string, unknown>)
        : undefined,
      childNatal: child
        ? (buildNatalChart(this.toBirthInput(child)) as unknown as Record<string, unknown>)
        : undefined,
      horoscope,
      realContext,
      relationName: spouse?.name ?? child?.name,
    };
  }

  formatRealContext(life: LifeContextDocument | null) {
    if (!life) return undefined;
    return {
      relationshipStatus: life.relationshipStatus,
      hasChildren: life.hasChildren,
      childAge: life.childAge,
      parentHealthConcern: life.parentHealthConcern,
      cityChangeRecently: life.cityChangeRecently,
      financialPressure: life.financialPressure,
      careerStage: life.careerStage,
      partnerNotes: life.partnerNotes,
      currentConflict: life.currentConflict,
      freeText: life.freeText,
      currentState: life.currentState,
      focusDirection: life.focusDirection,
      weeklyFocus: life.weeklyFocus,
      chatSummary: life.chatSummary,
      voiceDiaryEntries: life.voiceDiaryEntries,
      chatUploadText: life.chatUploadText,
      chatPatterns: life.chatPatterns,
    };
  }

  async syncUserChartContext(userId: string) {
    const ctx = await this.getChartContextForBot(userId);
    if (ctx) await this.users.setChartContext(userId, ctx);
  }

  private async requireBirthProfile(userId: string) {
    const profile = await this.birthModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!profile) throw new BadRequestException('请先建立紫微命盘（填写生辰）');
    return profile;
  }
}

interface ReportPayload {
  title: string;
  summary: string;
  themeLabel?: string;
  headlineSummary?: string;
  sections: { title: string; content: string }[];
}
