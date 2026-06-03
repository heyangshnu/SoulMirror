import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {}

  isVerifyEnabled(): boolean {
    return this.config.get<string>('EMAIL_VERIFY_ENABLED') === 'true';
  }

  isDevMode(): boolean {
    return (
      this.config.get<string>('EMAIL_DEV_MODE') === 'true' ||
      this.config.get<string>('NODE_ENV') !== 'production'
    );
  }

  /** 本地开发：未配 SMTP 时验证码只打日志，不发真实邮件 */
  isDevDelivery(): boolean {
    return this.isDevMode() && !this.isConfigured();
  }

  isConfigured(): boolean {
    return !!(
      this.config.get('SMTP_HOST') &&
      this.config.get('SMTP_USERNAME') &&
      this.config.get('SMTP_PASSWORD') &&
      this.config.get('SMTP_FROM')
    );
  }

  async sendVerificationCode(email: string, code: string, purpose: 'register' | 'reset'): Promise<void> {
    if (this.isDevMode() && !this.isConfigured()) {
      this.logger.log(`[Email dev] ${purpose} ${email} -> ${code}`);
      return;
    }

    if (!this.isConfigured()) {
      throw new Error('SMTP is not fully configured on the server');
    }

    const subject =
      purpose === 'register' ? '心镜 - 注册验证码' : '心镜 - 重置密码验证码';
    const text = `您的验证码是 ${code}，15 分钟内有效。如非本人操作请忽略此邮件。`;

    const port = Number(this.config.get('SMTP_PORT') ?? 587);
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port,
      secure,
      auth: {
        user: this.config.get<string>('SMTP_USERNAME'),
        pass: this.config.get<string>('SMTP_PASSWORD'),
      },
    });

    await transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: email,
      subject,
      text,
    });
  }
}
