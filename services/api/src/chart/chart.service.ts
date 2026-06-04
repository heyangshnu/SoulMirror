import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  buildChartContextText,
  buildFlyingStarAppendix,
  buildHoroscope,
  buildNatalChart,
  type BirthInput,
} from '@soulmirror/chart';
import { Model, Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { BotSession, BotSessionDocument } from '../schemas/bot-session.schema';
import { BirthProfile, BirthProfileDocument } from '../schemas/birth-profile.schema';
import { LifeContext, LifeContextDocument } from '../schemas/life-context.schema';
import { RelationProfile, RelationProfileDocument } from '../schemas/relation-profile.schema';
import { ReportsService } from '../reports/reports.service';
import { UsersService } from '../users/users.service';
import type { UpsertBirthProfileDto, CreateRelationDto } from './dto/chart.dto';

const MAX_RELATIONS = 6;

@Injectable()
export class ChartService {
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
    const y = new Date().getFullYear();
    const [natal, daxian, liunianYear, latestAny] = await Promise.all([
      this.reports.findLatestByTypes(userId, ['ziwei_natal']).then((r) => r[0]),
      this.reports.findLatestByTypes(userId, ['ziwei_daxian']).then((r) => r[0]),
      this.reports.findLatestLiunian(userId, y),
      this.reports.findByUser(userId).then((list) => list[0]),
    ]);

    const life = await this.getLifeContext(userId);
    const lines: string[] = [];

    if (life?.currentState?.trim()) lines.push(`用户当前状态：${life.currentState.trim()}`);
    if (life?.focusDirection?.trim()) lines.push(`用户关注方向：${life.focusDirection.trim()}`);

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
    pushReport('大限解读总结', daxian);
    pushReport(`${y}流年解读总结`, liunianYear);

    if (
      latestAny &&
      !latestAny.testType.startsWith('ziwei_') &&
      latestAny._id.toString() !== natal?._id.toString()
    ) {
      pushReport(`近期${latestAny.title}`, latestAny);
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

  private async syncUserChartContext(userId: string) {
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
