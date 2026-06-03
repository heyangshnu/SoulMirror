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
  themeLabel?: string;
  headlineSummary?: string;
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
    await this.users.setTestSummary(userId, payload.headlineSummary ?? payload.summary);
    await this.syncMatchProfile(userId, payload);
    return report;
  }

  private async syncMatchProfile(userId: string, payload: AiReportPayload) {
    const patch: Record<string, unknown> = {
      scores: { [payload.testType]: payload.score ?? 75 },
    };

    const raw = payload.raw ?? {};
    if (payload.testType === 'mbti') {
      const mbti = (raw.mbtiType ?? raw.type) as string | undefined;
      if (mbti) patch.mbti = mbti;
    }
    if (payload.testType === 'bazi' && typeof raw.dominant_element === 'string') {
      patch.baziElement = raw.dominant_element;
    }
    if (payload.testType === 'tarot' && payload.scoreLabel) {
      patch.tarotArchetype = payload.scoreLabel;
    }

    await this.users.updateMatchProfile(userId, patch as Parameters<UsersService['updateMatchProfile']>[1]);
  }
}
