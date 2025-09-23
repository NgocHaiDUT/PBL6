import { IsString, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  target_type?: string = 'post';

  @IsOptional()
  parent_id?: number;
}