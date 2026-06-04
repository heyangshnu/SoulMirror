import { IsBoolean, IsString, Matches, MinLength } from 'class-validator';

export class RegisterPhoneDto {
  @Matches(/^1\d{10}$/, { message: '请输入有效手机号' })
  phone: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  password: string;

  @IsBoolean()
  terms_accepted: boolean;

  @IsString()
  terms_version: string;
}

export class LoginPhoneDto {
  @Matches(/^1\d{10}$/, { message: '请输入有效手机号' })
  phone: string;

  @IsString()
  password: string;
}
