import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginEmailDto,
  RegisterDto,
  ResetPasswordDto,
  SendRegisterCodeDto,
  SendResetCodeDto,
} from './dto/email-auth.dto';
import { LoginPhoneDto, RegisterPhoneDto } from './dto/phone-auth.dto';
import { LoginSmsDto, SendSmsDto } from './dto/send-sms.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('config')
  config() {
    return this.authService.getConfig();
  }

  @Post('send-register-code')
  sendRegisterCode(@Body() dto: SendRegisterCodeDto) {
    return this.authService.sendRegisterCode(dto.email);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, {
      name: dto.name,
      verificationCode: dto.verification_code,
      termsAccepted: dto.terms_accepted,
      termsVersion: dto.terms_version,
    });
  }

  @Post('phone/register')
  registerPhone(@Body() dto: RegisterPhoneDto) {
    return this.authService.registerPhone(dto.phone, dto.password, {
      termsAccepted: dto.terms_accepted,
      termsVersion: dto.terms_version,
    });
  }

  @Post('phone/login')
  loginPhone(@Body() dto: LoginPhoneDto) {
    return this.authService.loginPhone(dto.phone, dto.password);
  }

  @Post('login')
  loginEmail(@Body() dto: LoginEmailDto) {
    return this.authService.loginEmail(dto.email, dto.password);
  }

  @Post('send-reset-password-code')
  sendResetCode(@Body() dto: SendResetCodeDto) {
    return this.authService.sendResetPasswordCode(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.verification_code, dto.new_password);
  }

  @Post('sms/send')
  sendSms(@Body() dto: SendSmsDto) {
    return this.authService.sendSms(dto.phone);
  }

  @Post('sms/login')
  login(@Body() dto: LoginSmsDto) {
    return this.authService.login(dto.phone, dto.code);
  }
}
