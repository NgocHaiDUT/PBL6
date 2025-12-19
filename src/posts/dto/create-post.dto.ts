import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreatePostDto {
  @IsOptional()
  @IsInt()
  user_id?: number;

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
  @Transform(({ value }) => {
    if (typeof value === 'string') return [Number(value)];
    if (Array.isArray(value)) return value.map(Number);
    return value;
  })
  @IsArray()
  @IsInt({ each: true })
  product_ids?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
