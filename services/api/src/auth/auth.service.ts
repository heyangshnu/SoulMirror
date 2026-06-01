import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SmsCode } from '../schemas/sms-code.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(SmsCode.name) private smsModel: Model<SmsCode>,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async sendSms(phone: string) {
    const code = process.env.NODE_ENV === 'production' ? this.randomCode() : '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.smsModel.deleteMany({ phone });
    await this.smsModel.create({ phone, code, expiresAt });
    return {
      success: true,
      message: process.env.NODE_ENV === 'production' ? '验证码已发送' : '开发模式验证码：123456',
    };
  }

  async login(phone: string, code: string) {
    const record = await this.smsModel.findOne({ phone, code }).sort({ createdAt: -1 });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('验证码无效或已过期');
    }
    await this.smsModel.deleteMany({ phone });
    let user = await this.usersService.findByPhone(phone);
    if (!user) user = await this.usersService.create({ phone });
    const userId = user._id.toString();
    const accessToken = this.jwtService.sign({ sub: userId });
    return {
      accessToken,
      user: { id: userId, phone: user.phone, nickname: user.nickname },
    };
  }

  private randomCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}
