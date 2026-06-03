import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from '../schemas/report.schema';
import type { AiReportPayload } from '../tests/tests.service';

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

  findByUser(userId: string) {
    return this.reportModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, reportId: string) {
    const report = await this.reportModel.findOne({
      _id: reportId,
      userId: new Types.ObjectId(userId),
    });
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
