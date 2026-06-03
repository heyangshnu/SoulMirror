import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SendRegisterCodeDto {
  @IsEmail()
  email: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  verification_code?: string;

  @IsBoolean()
  terms_accepted: boolean;

  @IsString()
  terms_version: string;
}

export class LoginEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class SendResetCodeDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  verification_code: string;

  @IsString()
  @MinLength(6)
  new_password: string;
}
