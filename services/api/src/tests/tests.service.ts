import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ReportsService } from '../reports/reports.service';
import { UsersService } from '../users/users.service';

export interface AiReportPayload {
  testType: string;
  title: string;
  summary: string;
  score?: number;
  scoreLabel?: string;
  sections: { title: string; content: string }[];
  raw?: Record<string, unknown>;
}

@Injectable()
export class TestsService {
  constructor(
    private ai: AiService,
    private reports: ReportsService,
    private users: UsersService,
  ) {}

  async submitAndSave(userId: string, aiPath: string, body: unknown) {
    const payload = await this.ai.post<AiReportPayload>(aiPath, body);
    const report = await this.reports.create(userId, payload);
    await this.users.setTestSummary(userId, `${payload.title}：${payload.summary}`);
    return report;
  }
}
