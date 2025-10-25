import { IsString, IsInt, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  target_type: string; // 'post', 'product', 'comment', etc.

  @IsInt()
  @Transform(({ value }) => parseInt(value))
  target_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Content must not exceed 2000 characters' })
  content: string;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => value ? parseInt(value) : null)
  parent_id?: number; // For nested comments/replies

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => value ? parseInt(value) : null)
  user_id?: number; // User ID from frontend
}