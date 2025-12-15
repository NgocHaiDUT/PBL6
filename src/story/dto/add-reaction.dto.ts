import { IsString, IsIn } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @IsIn(['❤️', '😂', '😮', '😢', '🔥', '👏'])
  emoji: string; // Allowed emoji reactions
}
