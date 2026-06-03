import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatRequest, ChatRequestDocument } from '../schemas/chat-request.schema';
import { DirectChat, DirectChatDocument } from '../schemas/direct-chat.schema';
import { Friendship, FriendshipDocument } from '../schemas/friendship.schema';
import { MatchProfile } from '../schemas/user.schema';
import { UsersService } from '../users/users.service';

const MBTI_COMPAT: Record<string, string[]> = {
  INTJ: ['ENFP', 'ENTP', 'INFJ'],
  INTP: ['ENTJ', 'ESTJ', 'ENFJ'],
  ENTJ: ['INTP', 'INFP', 'ENFP'],
  ENTP: ['INFJ', 'INTJ', 'ENFJ'],
  INFJ: ['ENTP', 'ENFP', 'INTJ'],
  INFP: ['ENFJ', 'ENTJ', 'ESTJ'],
  ENFJ: ['INFP', 'ISFP', 'INTP'],
  ENFP: ['INTJ', 'INFJ', 'ESTJ'],
  ISTJ: ['ESFP', 'ESTP', 'ISFP'],
  ISFJ: ['ESFP', 'ESTP', 'ENFP'],
  ESTJ: ['ISFP', 'ISTP', 'INFP'],
  ESFJ: ['ISFP', 'ISTP', 'INFP'],
  ISTP: ['ESTJ', 'ESFJ', 'ENFJ'],
  ISFP: ['ENFJ', 'ESFJ', 'ESTJ'],
  ESTP: ['ISFJ', 'ISTJ', 'INFJ'],
  ESFP: ['ISTJ', 'ISFJ', 'INFJ'],
};

const ELEMENT_CYCLE: Record<string, string> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

@Injectable()
export class SocialService {
  constructor(
    @InjectModel(ChatRequest.name) private chatRequestModel: Model<ChatRequestDocument>,
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
    @InjectModel(DirectChat.name) private directChatModel: Model<DirectChatDocument>,
    private usersService: UsersService,
  ) {}

  async getDiscoverStatus(userId: string) {
    const user = await this.usersService.findById(userId);
    const hasProfile = !!user?.matchProfile?.scores && Object.keys(user.matchProfile.scores).length > 0;
    return {
      discoverable: user?.discoverable ?? false,
      hasMatchProfile: hasProfile,
      matchProfile: user?.matchProfile,
    };
  }

  async setDiscoverable(userId: string, discoverable: boolean) {
    const user = await this.usersService.findById(userId);
    const hasProfile = !!user?.matchProfile?.scores && Object.keys(user.matchProfile.scores).length > 0;
    if (discoverable && !hasProfile) {
      throw new BadRequestException('请先完成至少一项探索测试后再开启磁场匹配');
    }
    await this.usersService.updateProfile(userId, { discoverable });
    return { discoverable };
  }

  async discover(userId: string) {
    const me = await this.usersService.findById(userId);
    if (!me?.matchProfile?.scores || Object.keys(me.matchProfile.scores).length === 0) {
      throw new BadRequestException('请先完成探索测试');
    }

    const friendIds = await this.getFriendUserIds(userId);
    const pendingIds = await this.getPendingUserIds(userId);
    const exclude = [userId, ...friendIds, ...pendingIds];

    const candidates = await this.usersService.findDiscoverableUsers(exclude);

    return candidates
      .map((u) => ({
        id: u._id.toString(),
        nickname: u.nickname,
        scores: u.matchProfile?.scores ?? {},
        mbti: u.matchProfile?.mbti,
        baziElement: u.matchProfile?.baziElement,
        tarotArchetype: u.matchProfile?.tarotArchetype,
        compatibility: this.computeCompatibility(me.matchProfile!, u.matchProfile!),
      }))
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, 20);
  }

  async sendChatRequest(fromUserId: string, toUserId: string, message?: string) {
    if (fromUserId === toUserId) throw new BadRequestException('不能向自己发送申请');

    const toUser = await this.usersService.findById(toUserId);
    if (!toUser?.discoverable) throw new NotFoundException('用户不存在或未开启匹配');

    const existingFriend = await this.friendshipModel.findOne({
      $or: [
        { userA: new Types.ObjectId(fromUserId), userB: new Types.ObjectId(toUserId) },
        { userA: new Types.ObjectId(toUserId), userB: new Types.ObjectId(fromUserId) },
      ],
    });
    if (existingFriend) throw new BadRequestException('你们已经是好友');

    try {
      const req = await this.chatRequestModel.create({
        fromUserId: new Types.ObjectId(fromUserId),
        toUserId: new Types.ObjectId(toUserId),
        message,
        status: 'pending',
      });
      return { id: req._id.toString(), status: req.status };
    } catch {
      throw new BadRequestException('已发送过申请，请等待对方回应');
    }
  }

  async listChatRequests(userId: string) {
    const uid = new Types.ObjectId(userId);
    const incoming = await this.chatRequestModel
      .find({ toUserId: uid, status: 'pending' })
      .sort({ createdAt: -1 })
      .exec();
    const outgoing = await this.chatRequestModel
      .find({ fromUserId: uid })
      .sort({ createdAt: -1 })
      .exec();

    const enrich = async (items: ChatRequestDocument[], direction: 'incoming' | 'outgoing') => {
      return Promise.all(
        items.map(async (r) => {
          const otherId =
            direction === 'incoming' ? r.fromUserId.toString() : r.toUserId.toString();
          const other = await this.usersService.findById(otherId);
          return {
            id: r._id.toString(),
            status: r.status,
            message: r.message,
            createdAt: r.createdAt,
            user: {
              id: otherId,
              nickname: other?.nickname ?? '心镜用户',
              scores: other?.matchProfile?.scores ?? {},
              mbti: other?.matchProfile?.mbti,
            },
          };
        }),
      );
    };

    return {
      incoming: await enrich(incoming, 'incoming'),
      outgoing: await enrich(outgoing, 'outgoing'),
    };
  }

  async respondChatRequest(userId: string, requestId: string, accept: boolean) {
    const req = await this.chatRequestModel.findById(requestId);
    if (!req || req.toUserId.toString() !== userId) {
      throw new NotFoundException('申请不存在');
    }
    if (req.status !== 'pending') throw new BadRequestException('申请已处理');

    req.status = accept ? 'accepted' : 'rejected';
    await req.save();

    if (accept) {
      const [a, b] = [req.fromUserId, req.toUserId].sort((x, y) =>
        x.toString().localeCompare(y.toString()),
      );
      await this.friendshipModel.findOneAndUpdate(
        { userA: a, userB: b },
        { userA: a, userB: b },
        { upsert: true },
      );
      await this.directChatModel.findOneAndUpdate(
        { participants: { $all: [req.fromUserId, req.toUserId], $size: 2 } },
        { participants: [req.fromUserId, req.toUserId], messages: [] },
        { upsert: true },
      );
    }

    return { status: req.status };
  }

  async listFriends(userId: string) {
    const uid = new Types.ObjectId(userId);
    const friendships = await this.friendshipModel
      .find({ $or: [{ userA: uid }, { userB: uid }] })
      .exec();

    return Promise.all(
      friendships.map(async (f) => {
        const otherId = f.userA.toString() === userId ? f.userB.toString() : f.userA.toString();
        const other = await this.usersService.findById(otherId);
        return {
          id: otherId,
          nickname: other?.nickname ?? '心镜用户',
          scores: other?.matchProfile?.scores ?? {},
          mbti: other?.matchProfile?.mbti,
          since: f.createdAt,
        };
      }),
    );
  }

  async getDirectChat(userId: string, friendId: string) {
    await this.ensureFriends(userId, friendId);
    const chat = await this.findDirectChat(userId, friendId);
    if (!chat) return { messages: [] };
    return {
      id: chat._id.toString(),
      messages: chat.messages.map((m) => ({
        role: m.role,
        senderId: m.senderId.toString(),
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  async sendDirectMessage(userId: string, friendId: string, content: string) {
    await this.ensureFriends(userId, friendId);
    let chat = await this.findDirectChat(userId, friendId);
    if (!chat) {
      chat = await this.directChatModel.create({
        participants: [new Types.ObjectId(userId), new Types.ObjectId(friendId)],
        messages: [],
      });
    }

    chat.messages.push({
      role: 'user',
      senderId: new Types.ObjectId(userId),
      content,
      createdAt: new Date(),
    });
    await chat.save();

    return { success: true };
  }

  private async ensureFriends(userId: string, friendId: string) {
    const uid = new Types.ObjectId(userId);
    const fid = new Types.ObjectId(friendId);
    const friendship = await this.friendshipModel.findOne({
      $or: [
        { userA: uid, userB: fid },
        { userA: fid, userB: uid },
      ],
    });
    if (!friendship) throw new ForbiddenException('你们还不是好友');
  }

  private findDirectChat(userId: string, friendId: string) {
    return this.directChatModel.findOne({
      participants: { $all: [new Types.ObjectId(userId), new Types.ObjectId(friendId)], $size: 2 },
    });
  }

  private async getFriendUserIds(userId: string): Promise<string[]> {
    const uid = new Types.ObjectId(userId);
    const friendships = await this.friendshipModel
      .find({ $or: [{ userA: uid }, { userB: uid }] })
      .exec();
    return friendships.map((f) =>
      f.userA.toString() === userId ? f.userB.toString() : f.userA.toString(),
    );
  }

  private async getPendingUserIds(userId: string): Promise<string[]> {
    const uid = new Types.ObjectId(userId);
    const reqs = await this.chatRequestModel
      .find({
        status: 'pending',
        $or: [{ fromUserId: uid }, { toUserId: uid }],
      })
      .exec();
    return reqs.map((r) =>
      r.fromUserId.toString() === userId ? r.toUserId.toString() : r.fromUserId.toString(),
    );
  }

  computeCompatibility(a: MatchProfile, b: MatchProfile): number {
    let score = 50;
    let factors = 0;

    if (a.mbti && b.mbti) {
      factors += 1;
      const compat = MBTI_COMPAT[a.mbti.toUpperCase()] ?? [];
      if (compat.includes(b.mbti.toUpperCase())) score += 25;
      else if (a.mbti[0] === b.mbti[0]) score += 10;
      else score += 5;
    }

    if (a.baziElement && b.baziElement) {
      factors += 1;
      if (ELEMENT_CYCLE[a.baziElement] === b.baziElement) score += 20;
      else if (a.baziElement === b.baziElement) score += 10;
      else score += 5;
    }

    const aScores = Object.values(a.scores ?? {});
    const bScores = Object.values(b.scores ?? {});
    if (aScores.length && bScores.length) {
      factors += 1;
      const aAvg = aScores.reduce((s, v) => s + v, 0) / aScores.length;
      const bAvg = bScores.reduce((s, v) => s + v, 0) / bScores.length;
      const diff = Math.abs(aAvg - bAvg);
      score += Math.max(0, 20 - diff / 5);
    }

    if (a.tarotArchetype && b.tarotArchetype && a.tarotArchetype === b.tarotArchetype) {
      factors += 1;
      score += 10;
    }

    return Math.min(99, Math.round(factors > 0 ? score : 50));
  }
}
