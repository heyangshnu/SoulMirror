import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  ageRange?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  concern?: string;

  @IsOptional()
  @IsString()
  botTone?: string;

  @IsOptional()
  @IsBoolean()
  anonymousMode?: boolean;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsBoolean()
  discoverable?: boolean;
}
