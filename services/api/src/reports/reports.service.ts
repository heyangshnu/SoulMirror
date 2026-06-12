import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from '../schemas/report.schema';
import type { AiReportPayload } from '../tests/tests.service';

export interface InternalAnalysisCard {
  id: string;
  conclusion: string;
  sources: { type: string; evidence: string }[];
  reasoning: string[];
  confidence: number;
  matchedContentIds: string[];
}

export interface PlanReportInput {
  topic?: string;
  title: string;
  portrait: string;
  stage?: string;
  plans: { id: string; title: string; body: string; actions: string[]; phrases?: string[] }[];
  followUpQuestions: string[];
  disclaimer: string;
  coverageLevel: string;
  summary?: string;
  headlineSummary?: string;
  testType?: string;
  _internal?: InternalAnalysisCard[];
  raw?: Record<string, unknown>;
}

@Injectable()
export class ReportsService {
  constructor(@InjectModel(Report.name) private reportModel: Model<ReportDocument>) {}

  create(userId: string, payload: AiReportPayload) {
    return this.reportModel.create({
      userId: new Types.ObjectId(userId),
      testType: payload.testType,
      title: payload.title,
      summary: payload.summary,
      score: payload.score,
      scoreLabel: payload.scoreLabel,
      themeLabel: payload.themeLabel,
      headlineSummary: payload.headlineSummary,
      sections: payload.sections,
      raw: payload.raw,
    });
  }

  createPlan(userId: string, payload: PlanReportInput, topic: string) {
    const internal = payload._internal;
    return this.reportModel.create({
      userId: new Types.ObjectId(userId),
      testType: payload.testType ?? `plan_${topic}`,
      topic,
      title: payload.title,
      summary: payload.summary ?? payload.portrait,
      headlineSummary: payload.headlineSummary ?? payload.portrait,
      portrait: payload.portrait,
      stage: payload.stage,
      disclaimer: payload.disclaimer,
      coverageLevel: payload.coverageLevel,
      plans: payload.plans,
      followUpQuestions: payload.followUpQuestions ?? [],
      internal,
      sections: [],
      raw: payload.raw,
    });
  }

  findByUser(userId: string) {
    return this.reportModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, reportId: string) {
    const report = await this.reportModel
      .findOne({
        _id: reportId,
        userId: new Types.ObjectId(userId),
      })
      .select('-internal');
    if (!report) throw new NotFoundException('报告不存在');
    return report;
  }

  findLatestByTypes(userId: string, types: string[]) {
    return Promise.all(
      types.map((testType) =>
        this.reportModel
          .findOne({ userId: new Types.ObjectId(userId), testType })
          .sort({ createdAt: -1 })
          .exec(),
      ),
    );
  }

  findLatestLiunian(userId: string, year: number) {
    return this.reportModel
      .findOne({
        userId: new Types.ObjectId(userId),
        testType: 'ziwei_liunian',
        'raw.year': year,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async toggleFavorite(userId: string, reportId: string) {
    const report = await this.findOne(userId, reportId);
    report.favorited = !report.favorited;
    return report.save();
  }
}
