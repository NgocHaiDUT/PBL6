import { IsOptional, IsInt, IsString, IsEnum } from 'class-validator';

export class QueryPostsDto {
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @IsInt()
  limit?: number = 10;

  @IsOptional()
  @IsInt()
  user_id?: number;

  @IsOptional()
  @IsInt()
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