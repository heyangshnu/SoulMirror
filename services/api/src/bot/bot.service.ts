import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { BotSession, BotSessionDocument } from '../schemas/bot-session.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class BotService {
  constructor(
    @InjectModel(BotSession.name) private sessionModel: Model<BotSessionDocument>,
    private ai: AiService,
    private usersService: UsersService,
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

    const aiRes = await this.ai.post<{ reply: string; crisis: boolean }>('/bot/chat', {
      message,
      tone: user?.botTone ?? 'gentle',
      test_summary: user?.lastTestSummary,
      profile_summary: profileParts.join('；') || undefined,
      history: history.slice(0, -1),
    });

    session.messages.push({
      role: 'assistant',
      content: aiRes.reply,
      createdAt: new Date(),
    });
    await session.save();

    return { reply: aiRes.reply, crisis: aiRes.crisis };
  }
}
