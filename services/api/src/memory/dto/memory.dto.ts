import { IsIn, IsString } from 'class-validator';

export class ConfirmMemoryDto {
  @IsString()
  noteId: string;

  @IsIn(['confirm', 'reject'])
  action: 'confirm' | 'reject';
}
