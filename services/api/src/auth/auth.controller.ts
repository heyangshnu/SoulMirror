import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginSmsDto, SendSmsDto } from './dto/send-sms.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sms/send')
  sendSms(@Body() dto: SendSmsDto) {
    return this.authService.sendSms(dto.phone);
  }

  @Post('sms/login')
  login(@Body() dto: LoginSmsDto) {
    return this.authService.login(dto.phone, dto.code);
  }
}
