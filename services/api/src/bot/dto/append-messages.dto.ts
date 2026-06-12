import { Type } from 'class-transformer';
import { IsArray, IsIn, IsString, MinLength, ValidateNested } from 'class-validator';

class ChatMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: string;

  @IsString()
  @MinLength(1)
  content: string;
}

export class AppendMessagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}
