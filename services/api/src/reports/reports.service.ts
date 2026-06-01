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

  async toggleFavorite(userId: string, reportId: string) {
    const report = await this.findOne(userId, reportId);
    report.favorited = !report.favorited;
    return report.save();
  }
}
