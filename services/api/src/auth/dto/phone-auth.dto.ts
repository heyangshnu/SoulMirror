import { IsBoolean, IsString, MinLength } from 'class-validator';

export class RegisterPhoneDto {
  @IsString()
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
  @IsString()
  phone: string;

  @IsString()
  password: string;
}
