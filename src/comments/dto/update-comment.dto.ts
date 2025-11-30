import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Content must not exceed 2000 characters' })
  content?: string;
}
