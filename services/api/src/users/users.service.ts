import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  findByPhone(phone: string) {
    return this.userModel.findOne({ phone }).exec();
  }

  create(data: { phone?: string; nickname?: string }) {
    return this.userModel.create(data);
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
    },
  ) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: data }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async deleteAccount(userId: string) {
    await this.userModel.findByIdAndDelete(userId).exec();
    return { success: true };
  }

  async setTestSummary(userId: string, summary: string) {
    await this.userModel.findByIdAndUpdate(userId, { lastTestSummary: summary }).exec();
  }
}
