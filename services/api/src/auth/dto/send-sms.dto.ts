import { IsString, Matches } from 'class-validator';

export class SendSmsDto {
  @Matches(/^1\d{10}$/, { message: '请输入有效手机号' })
  phone: string;
}

export class LoginSmsDto {
  @Matches(/^1\d{10}$/, { message: '请输入有效手机号' })
  phone: string;

  @IsString()
  code: string;
}
