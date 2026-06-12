import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RealContextDto {
  @IsOptional()
  @IsEnum(['single', 'dating', 'married', 'separated'])
  relationshipStatus?: string;

  @IsOptional()
  @IsBoolean()
  hasChildren?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  childAge?: number;

  @IsOptional()
  @IsBoolean()
  parentHealthConcern?: boolean;

  @IsOptional()
  @IsBoolean()
  cityChangeRecently?: boolean;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  financialPressure?: string;

  @IsOptional()
  @IsString()
  careerStage?: string;

  @IsOptional()
  @IsString()
  partnerNotes?: string;

  @IsOptional()
  @IsString()
  currentConflict?: string;

  @IsOptional()
  @IsString()
  freeText?: string;

  @IsOptional()
  @IsString()
  currentState?: string;

  @IsOptional()
  @IsString()
  focusDirection?: string;
}

export class FollowUpHistoryItemDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: string;

  @IsString()
  content: string;
}

export class FollowUpDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  planCardId?: string;

  @IsOptional()
  @IsString()
  planContext?: string;

  @IsOptional()
  realContextPatch?: RealContextDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FollowUpHistoryItemDto)
  history?: FollowUpHistoryItemDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  layer?: number;
}

export class SynastryDto {
  @IsString()
  relationId: string;
}

export class RecentYearsDto {
  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(2100)
  year?: number;
}

export class ChatUploadDto {
  @IsString()
  text: string;
}

export class FamilySystemDto {
  @IsOptional()
  @IsString()
  spouseRelationId?: string;

  @IsOptional()
  @IsString()
  childRelationId?: string;
}
