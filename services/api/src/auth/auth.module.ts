import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SmsCode, SmsCodeSchema } from '../schemas/sms-code.schema';
import { EmailOtp, EmailOtpSchema } from '../schemas/email-otp.schema';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email/email.service';
import { JwtStrategy } from './jwt.strategy';
import { SmsService } from './sms/sms.service';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'soulmirror-dev-secret',
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: SmsCode.name, schema: SmsCodeSchema },
      { name: EmailOtp.name, schema: EmailOtpSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, SmsService, EmailService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
