import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { EmailOtp } from '../schemas/email-otp.schema';
import { SmsCode } from '../schemas/sms-code.schema';
import { UsersService } from '../users/users.service';
import { EmailService } from './email/email.service';
import { SmsService } from './sms/sms.service';
import { assertValidPhone } from './phone.util';

const TERMS_VERSION = '1.0';
const OTP_TTL_MS = 15 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(SmsCode.name) private smsModel: Model<SmsCode>,
    @InjectModel(EmailOtp.name) private emailOtpModel: Model<EmailOtp>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private smsService: SmsService,
    private emailService: EmailService,
  ) {}

  getConfig() {
    return {
      phone_password_enabled: true,
      email_password_enabled: true,
      email_verify_enabled: this.emailService.isVerifyEnabled(),
      email_dev_mode: this.emailService.isDevDelivery(),
      terms_version: TERMS_VERSION,
      terms_required: true,
    };
  }

  // ── Phone + password ──

  async registerPhone(
    phone: string,
    password: string,
    options: { termsAccepted: boolean; termsVersion: string },
  ) {
    if (!options.termsAccepted) {
      throw new BadRequestException('请先同意用户协议');
    }
    if (options.termsVersion !== TERMS_VERSION) {
      throw new BadRequestException('协议版本已更新，请刷新后重试');
    }

    const normalized = assertValidPhone(phone);
    const existing = await this.usersService.findByPhone(normalized);
    if (existing) throw new ConflictException('该手机号已注册');

    const passwordHash = await bcrypt.hash(password, 10);
    const suffix = normalized.replace(/\D/g, '').slice(-4) || '0000';
    const user = await this.usersService.create({
      phone: normalized,
      passwordHash,
      nickname: `用户${suffix}`,
      termsAcceptedAt: new Date(),
      termsVersion: options.termsVersion,
    });

    return this.buildAuthResponse(user);
  }

  async loginPhone(phone: string, password: string) {
    const normalized = assertValidPhone(phone);
    const user = await this.usersService.findByPhone(normalized);
    if (!user?.passwordHash || user.status !== 'active') {
      throw new UnauthorizedException('手机号或密码错误');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('手机号或密码错误');
    return this.buildAuthResponse(user);
  }

  // ── SMS (legacy) ──

  async sendSms(phone: string) {
    const useDevCode = this.smsService.isDevMode();
    const code = useDevCode ? '123456' : this.randomCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.smsModel.deleteMany({ phone });
    await this.smsModel.create({ phone, code, expiresAt });

    if (!useDevCode) {
      try {
        await this.smsService.sendVerificationCode(phone, code);
      } catch (err) {
        await this.smsModel.deleteMany({ phone });
        this.logger.error(`SMS send failed for ${phone}`, err);
        throw err;
      }
    }

    return {
      success: true,
      message: useDevCode ? '开发模式验证码：123456' : '验证码已发送',
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
    return this.buildAuthResponse(user);
  }

  // ── Email (sub2api-style) ──

  async sendRegisterCode(email: string) {
    if (!this.emailService.isVerifyEnabled()) {
      throw new BadRequestException('服务器未开启邮箱验证');
    }

    const normalized = email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(normalized);
    if (existing) throw new ConflictException('该邮箱已注册');

    await this.checkOtpCooldown(normalized, 'register');
    const code = this.randomCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.emailOtpModel.findOneAndUpdate(
      { email: normalized, purpose: 'register' },
      { email: normalized, purpose: 'register', codeHash, expiresAt },
      { upsert: true, new: true },
    );

    await this.emailService.sendVerificationCode(normalized, code, 'register');
    const out: { message: string; dev_code?: string } = { message: '验证码已发送' };
    if (this.emailService.isDevDelivery()) {
      out.dev_code = code;
      out.message = '开发模式：未配置 SMTP，验证码见 dev_code 或 API 终端日志';
    }
    return out;
  }

  async register(
    email: string,
    password: string,
    options: {
      name?: string;
      verificationCode?: string;
      termsAccepted: boolean;
      termsVersion: string;
    },
  ) {
    if (!options.termsAccepted) {
      throw new BadRequestException('请先同意用户协议');
    }
    if (options.termsVersion !== TERMS_VERSION) {
      throw new BadRequestException('协议版本已更新，请刷新后重试');
    }

    const normalized = email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(normalized);
    if (existing) throw new ConflictException('该邮箱已注册');

    if (this.emailService.isVerifyEnabled()) {
      const code = options.verificationCode?.trim();
      if (!code) throw new BadRequestException('请输入邮箱验证码');
      await this.consumeOtp(normalized, 'register', code);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email: normalized,
      passwordHash,
      emailVerified: true,
      nickname: options.name?.trim() || normalized.split('@')[0],
      termsAcceptedAt: new Date(),
      termsVersion: options.termsVersion,
    });

    return this.buildAuthResponse(user);
  }

  async loginEmail(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user?.passwordHash || user.status !== 'active') {
      throw new UnauthorizedException('邮箱或密码错误');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('邮箱或密码错误');
    return this.buildAuthResponse(user);
  }

  async sendResetPasswordCode(email: string) {
    if (!this.emailService.isVerifyEnabled()) {
      throw new BadRequestException('服务器未开启邮箱验证');
    }

    const normalized = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user || user.status !== 'active') {
      return { message: '若该邮箱已注册，验证码将发送到您的邮箱' };
    }

    await this.checkOtpCooldown(normalized, 'reset');
    const code = this.randomCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.emailOtpModel.findOneAndUpdate(
      { email: normalized, purpose: 'reset' },
      { email: normalized, purpose: 'reset', codeHash, expiresAt },
      { upsert: true, new: true },
    );

    await this.emailService.sendVerificationCode(normalized, code, 'reset');
    const out: { message: string; dev_code?: string } = {
      message: '若该邮箱已注册，验证码将发送到您的邮箱',
    };
    if (this.emailService.isDevDelivery()) {
      out.dev_code = code;
      out.message = '开发模式：验证码见 dev_code 或 API 终端日志';
    }
    return out;
  }

  async resetPassword(email: string, verificationCode: string, newPassword: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalized);
    if (!user) throw new BadRequestException('验证码无效或已过期');

    await this.consumeOtp(normalized, 'reset', verificationCode);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user._id.toString(), passwordHash);
    return { message: '密码已重置，请使用新密码登录' };
  }

  private async checkOtpCooldown(email: string, purpose: 'register' | 'reset') {
    const existing = await this.emailOtpModel.findOne({ email, purpose });
    if (existing?.createdAt) {
      const elapsed = Date.now() - new Date(existing.createdAt).getTime();
      if (elapsed < OTP_COOLDOWN_MS) {
        throw new HttpException('请稍后再试（60 秒内只能发送一次）', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }

  private async consumeOtp(email: string, purpose: 'register' | 'reset', code: string) {
    const record = await this.emailOtpModel.findOne({ email, purpose });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('验证码无效或已过期');
    }
    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) throw new BadRequestException('验证码无效或已过期');
    await this.emailOtpModel.deleteOne({ _id: record._id });
  }

  private buildAuthResponse(user: { _id: { toString(): string }; email?: string; phone?: string; nickname: string }) {
    const userId = user._id.toString();
    const accessToken = this.jwtService.sign({ sub: userId });
    return {
      accessToken,
      user: {
        id: userId,
        email: user.email,
        phone: user.phone,
        nickname: user.nickname,
      },
    };
  }

  private randomCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}
