import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { buildHoroscope, buildNatalChart } from '@soulmirror/chart';
import { Model, Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { ChartService } from '../chart/chart.service';
import { LifeContext, LifeContextDocument } from '../schemas/life-context.schema';
import { ReportsService, type PlanReportInput } from '../reports/reports.service';
import { UsersService } from '../users/users.service';
import type { RealContextDto } from './dto/analysis.dto';

@Injectable()
export class AnalysisService {
  constructor(
    private chartService: ChartService,
    private ai: AiService,
    private reports: ReportsService,
    private users: UsersService,
    @InjectModel(LifeContext.name) private lifeModel: Model<LifeContextDocument>,
  ) {}

  async generateNatal(userId: string, topic = 'self_profile') {
    return this.generate(userId, '/analysis/natal', topic, { topic });
  }

  async generateRecentYears(userId: string, year?: number) {
    const y = year ?? new Date().getFullYear();
    const horoscope = await this.chartService.getHoroscope(userId, y);
    return this.generate(userId, '/analysis/recent-years', 'recent_years', { horoscope });
  }

  async generateSynastry(userId: string, relationId: string) {
    const ctx = await this.chartService.getSynastryContext(userId, relationId);
    return this.generate(userId, '/analysis/synastry', 'synastry', {
      natal: ctx.natal,
      ownerNatal: ctx.ownerNatal,
      horoscope: ctx.horoscope,
      relationName: ctx.relationName,
    });
  }

  async generateChild(userId: string, relationId: string) {
    const ctx = await this.chartService.getChildContext(userId, relationId);
    return this.generate(userId, '/analysis/child', 'child_environment', ctx);
  }

  async generateFamilySystem(userId: string) {
    const ctx = await this.chartService.getFamilySystemContext(userId);
    return this.generate(userId, '/analysis/family-system', 'family_system', ctx);
  }

  async analyzeChatUpload(userId: string, text: string) {
    const result = await this.ai.post<{
      summary: string;
      patterns?: string[];
      escalationLine?: number;
      recommendations?: string[];
      tags?: unknown[];
    }>('/analysis/chat-upload/analyze', { text });

    await this.lifeModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        $set: {
          chatUploadText: text.slice(0, 12000),
          chatPatterns: {
            summary: result.summary,
            patterns: result.patterns,
            escalationLine: result.escalationLine,
            recommendations: result.recommendations,
          },
          chatSummary: result.summary,
          lastChatSummaryAt: new Date(),
        },
      },
      { upsert: true },
    );
    await this.chartService.syncUserChartContext(userId);
    return result;
  }

  async exportReportPdf(userId: string, reportId: string): Promise<Buffer> {
    const report = await this.getPlanReport(userId, reportId);
    const locale = this.ai.locale;
    const res = await this.ai.postBuffer('/analysis/export-pdf', {
      report,
      locale,
    });
    return res;
  }

  private async generate(
    userId: string,
    aiPath: string,
    topic: string,
    extra: Record<string, unknown>,
  ) {
    const { natal, bazi, realContext } = await this.chartService.getAnalysisInput(userId);
    const payload = await this.ai.post<PlanReportInput>(aiPath, {
      natal,
      bazi,
      realContext,
      ...extra,
    });
    const report = await this.reports.createPlan(userId, payload, topic);
    await this.users.setTestSummary(userId, payload.portrait ?? payload.summary);
    const doc = report as { _id: { toString(): string }; title: string; topic?: string; testType: string; coverageLevel?: string };
    return {
      _id: doc._id.toString(),
      title: doc.title,
      topic: doc.topic,
      testType: doc.testType,
      coverageLevel: doc.coverageLevel,
    };
  }

  async upsertRealContext(userId: string, dto: RealContextDto) {
    const doc = await this.lifeModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: dto },
      { upsert: true, new: true },
    );
    await this.chartService.syncUserChartContext(userId);
    return doc;
  }

  async getRealContext(userId: string) {
    return this.lifeModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async getPlanReport(userId: string, reportId: string) {
    const report = await this.reports.findOne(userId, reportId);
    if (!report.plans?.length && !report.sections?.length) {
      throw new NotFoundException('报告不存在');
    }
    const obj = report.toObject();
    delete (obj as { internal?: unknown }).internal;
    return obj;
  }

  async followUp(
    userId: string,
    body: {
      message: string;
      topic?: string;
      planCardId?: string;
      planContext?: string;
      realContextPatch?: RealContextDto;
      history?: { role: string; content: string }[];
      layer?: number;
    },
  ) {
    if (body.realContextPatch) {
      await this.upsertRealContext(userId, body.realContextPatch);
    }
    const realContext = await this.getRealContext(userId);
    return this.ai.post<{ reply: string; needsRealContext?: boolean; suggestedQuestions?: string[]; actionTip?: string }>(
      '/followup/ask',
      {
        message: body.message,
        topic: body.topic ?? 'self_profile',
        planCardId: body.planCardId,
        planContext: body.planContext,
        history: body.history ?? [],
        realContext: realContext?.toObject?.() ?? realContext,
        layer: body.layer ?? 1,
      },
    );
  }
}
