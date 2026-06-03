import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertBirthProfileDto {
  @IsString()
  birthDate: string;

  @IsString()
  birthTime: string;

  @IsEnum(['male', 'female'])
  gender: 'male' | 'female';

  @IsOptional()
  @IsEnum(['solar', 'lunar'])
  calendar?: 'solar' | 'lunar';

  @IsOptional()
  @IsBoolean()
  isLeapMonth?: boolean;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  timeUnknown?: boolean;

  @IsOptional()
  @IsString()
  currentState?: string;

  @IsOptional()
  @IsString()
  focusDirection?: string;
}

export class LiuNianReportDto {
  @IsOptional()
  @IsNumber()
  year?: number;
}

export class CreateRelationDto {
  @IsEnum(['spouse', 'child', 'parent', 'sibling', 'other'])
  relationType: 'spouse' | 'child' | 'parent' | 'sibling' | 'other';

  @IsString()
  name: string;

  @IsString()
  birthDate: string;

  @IsString()
  birthTime: string;

  @IsEnum(['male', 'female'])
  gender: 'male' | 'female';

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsBoolean()
  timeUnknown?: boolean;
}

export class VoiceDiaryDto {
  @IsOptional()
  @IsString()
  text?: string;
}

export class WeeklyFocusDto {
  @IsString()
  focus: string;
}
