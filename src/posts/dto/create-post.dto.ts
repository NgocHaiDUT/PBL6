import { IsString, IsOptional, IsArray, IsEnum, IsInt, IsBoolean } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsInt()
  shop_id?: number;

  @IsOptional()
  @IsString()
  post_type?: string = 'post';

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  content_md: string;

  @IsOptional()
  @IsString()
  cover_url?: string; // Ảnh đại diện chính của bài viết

  @IsOptional()
  @IsString()
  video_url?: string; // Video chính của bài viết

  @IsOptional()
  @IsEnum(['public', 'private', 'friends'])
  visibility?: string = 'public';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media_urls?: string[]; // Các media bổ sung (sẽ lưu vào post_media)

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  product_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}