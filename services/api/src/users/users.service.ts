import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MatchProfile, User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  findByPhone(phone: string) {
    return this.userModel.findOne({ phone }).exec();
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.trim().toLowerCase() }).exec();
  }

  create(data: {
    phone?: string;
    email?: string;
    passwordHash?: string;
    emailVerified?: boolean;
    nickname?: string;
    termsAcceptedAt?: Date;
    termsVersion?: string;
  }) {
    return this.userModel.create(data);
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.userModel.findByIdAndUpdate(userId, { $set: { passwordHash } }).exec();
  }

  async updateProfile(
    userId: string,
    data: {
      ageRange?: string;
      occupation?: string;
      concern?: string;
      botTone?: string;
      anonymousMode?: boolean;
      nickname?: string;
      discoverable?: boolean;
    },
  ) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: data }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async deleteAccount(userId: string) {
    const result = await this.userModel.findByIdAndDelete(userId).exec();
    if (!result) {
      // Idempotent: account already gone — still treat as success for the client.
      return { success: true, alreadyDeleted: true };
    }
    return { success: true };
  }

  async setTestSummary(userId: string, summary: string) {
    await this.userModel.findByIdAndUpdate(userId, { lastTestSummary: summary }).exec();
  }

  async setChartContext(userId: string, chartContext: string) {
    await this.userModel.findByIdAndUpdate(userId, { chartContext }).exec();
  }

  async updateMatchProfile(userId: string, patch: Partial<MatchProfile>) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;
    const current = user.matchProfile ?? { scores: {} };
    const scores = { ...current.scores, ...(patch.scores ?? {}) };
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        matchProfile: {
          ...current,
          ...patch,
          scores,
        },
      },
    });
  }

  findDiscoverableUsers(excludeIds: string[]) {
    return this.userModel
      .find({
        discoverable: true,
        status: 'active',
        _id: { $nin: excludeIds },
        'matchProfile.scores': { $exists: true, $ne: {} },
      })
      .select('nickname matchProfile discoverable')
      .limit(50)
      .exec();
  }
}
