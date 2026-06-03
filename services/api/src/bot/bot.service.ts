import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Response } from 'express';
import { AiService } from '../ai/ai.service';
import { ChartService } from '../chart/chart.service';
import { BotSession, BotSessionDocument } from '../schemas/bot-session.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class BotService {
  constructor(
    @InjectModel(BotSession.name) private sessionModel: Model<BotSessionDocument>,
    private ai: AiService,
    private usersService: UsersService,
    private chartService: ChartService,
  ) {}

  async listSessions(userId: string) {
    return this.sessionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .select('-messages')
      .exec();
  }

  async createSession(userId: string) {
    return this.sessionModel.create({
      userId: new Types.ObjectId(userId),
      title: '心镜对话',
      messages: [],
    });
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.sessionModel.findOne({
      _id: sessionId,
      userId: new Types.ObjectId(userId),
    });
    if (!session) throw new NotFoundException('会话不存在');
    return session;
  }

  async sendMessage(userId: string, sessionId: string, message: string) {
    const { aiBody, session } = await this.prepareMessage(userId, sessionId, message);
    const aiRes = await this.ai.post<{ reply: string; crisis: boolean }>('/bot/chat', aiBody);
    session.messages.push({
      role: 'assistant',
      content: aiRes.reply,
      createdAt: new Date(),
    });
    await session.save();
    return { reply: aiRes.reply, crisis: aiRes.crisis };
  }

  async streamMessage(
    userId: string,
    sessionId: string,
    message: string,
    res: Response,
  ) {
    const { aiBody, session } = await this.prepareMessage(userId, sessionId, message);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let fullReply = '';
    let crisis = false;

    try {
      const stream = await this.ai.streamPost('/bot/chat/stream', aiBody);

      await new Promise<void>((resolve, reject) => {
        let buffer = '';

        stream.on('data', (chunk: Buffer) => {
          const text = chunk.toString();
          buffer += text;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(payload) as { delta?: string; crisis?: boolean };
              if (parsed.crisis) crisis = true;
              if (parsed.delta) {
                fullReply += parsed.delta;
                res.write(`data: ${JSON.stringify({ delta: parsed.delta })}\n\n`);
              }
            } catch {
              /* skip malformed */
            }
          }
        });

        stream.on('end', () => resolve());
        stream.on('error', reject);
      });

      if (fullReply) {
        session.messages.push({
          role: 'assistant',
          content: fullReply,
          createdAt: new Date(),
        });
        await session.save();
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch {
      res.write(`data: ${JSON.stringify({ delta: '连接暂时中断，请稍后再试。' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }

    return { crisis };
  }

  private async prepareMessage(userId: string, sessionId: string, message: string) {
    const session = await this.getSession(userId, sessionId);
    const user = await this.usersService.findById(userId);

    session.messages.push({ role: 'user', content: message, createdAt: new Date() });

    const history = session.messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const profileParts: string[] = [];
    if (user?.ageRange) profileParts.push(`年龄段：${user.ageRange}`);
    if (user?.occupation) profileParts.push(`职业：${user.occupation}`);
    if (user?.concern) profileParts.push(`困惑：${user.concern}`);

    const chartContext =
      user?.chartContext || (await this.chartService.getChartContextForBot(userId));

    const reportContext = await this.chartService.getLatestReportSummariesForBot(userId);

    const aiBody = {
      message,
      tone: user?.botTone ?? 'gentle',
      test_summary: user?.lastTestSummary,
      profile_summary: profileParts.join('；') || undefined,
      chart_context: chartContext || undefined,
      report_context: reportContext || undefined,
      history: history.slice(0, -1),
    };

    return { aiBody, session };
  }
}
