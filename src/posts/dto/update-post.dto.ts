import { IsString, IsOptional, IsArray, IsEnum, IsInt } from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsInt()
  shop_id?: number;

  @IsOptional()
  @IsString()
  post_type?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content_md?: string;

  @IsOptional()
  @IsString()
  cover_url?: string;

  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsEnum(['public', 'private', 'friends'])
  visibility?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media_urls?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  product_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
