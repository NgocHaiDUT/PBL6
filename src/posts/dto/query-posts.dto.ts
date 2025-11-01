import { IsOptional, IsInt, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryPostsDto {
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  user_id?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  shop_id?: number;

  @IsOptional()
  @IsString()
  post_type?: string;

  @IsOptional()
  @IsEnum(['public', 'private', 'friends'])
  visibility?: string;

  @IsOptional()
  @IsString()
  search?: string;
}