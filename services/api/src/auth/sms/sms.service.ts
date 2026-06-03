import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';

const SmsClient = tencentcloud.sms.v20210111.Client;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  /** 开发/测试模式：固定 123456，不调用短信网关 */
  isDevMode(): boolean {
    return (
      this.config.get<string>('SMS_DEV_MODE') === 'true' ||
      this.config.get<string>('NODE_ENV') !== 'production'
    );
  }

  async sendVerificationCode(phone: string, code: string): Promise<void> {
    if (this.isDevMode()) {
      this.logger.log(`[SMS dev] ${phone} -> ${code}`);
      return;
    }

    const secretId = this.config.get<string>('TENCENT_SMS_SECRET_ID');
    const secretKey = this.config.get<string>('TENCENT_SMS_SECRET_KEY');
    const sdkAppId = this.config.get<string>('TENCENT_SMS_SDK_APP_ID');
    const signName = this.config.get<string>('TENCENT_SMS_SIGN_NAME');
    const templateId = this.config.get<string>('TENCENT_SMS_TEMPLATE_ID');

    if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
      throw new Error(
        '短信服务未配置：请设置 TENCENT_SMS_SECRET_ID/SECRET_KEY/SDK_APP_ID/SIGN_NAME/TEMPLATE_ID',
      );
    }

    const client = new SmsClient({
      credential: { secretId, secretKey },
      region: this.config.get<string>('TENCENT_SMS_REGION') ?? 'ap-guangzhou',
      profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } },
    });

    const phoneNumber = phone.startsWith('+') ? phone : `+86${phone}`;

    await client.SendSms({
      SmsSdkAppId: sdkAppId,
      SignName: signName,
      TemplateId: templateId,
      TemplateParamSet: [code, '5'],
      PhoneNumberSet: [phoneNumber],
    });
  }
}
