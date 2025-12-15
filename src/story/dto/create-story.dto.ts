import { IsString, IsOptional, IsInt, IsArray, Min, Max, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateStoryDto {
  @IsString()
  @IsIn(['image', 'video'])
  story_type: 'image' | 'video';

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (typeof value === 'string') return parseInt(value, 10);
    return value;
  })
  @IsInt()
  @Min(1)
  @Max(30) // Maximum 30 seconds
  duration?: number;

  @IsOptional()
  @IsString()
  background_color?: string; // Hex color

  @IsOptional()
  @IsString()
  text_color?: string; // Hex color

  @IsOptional()
  @IsString()
  text_position?: string; // JSON string: {x, y, rotation, fontSize}

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    return value;
  })
  @IsArray()
  @Type(() => Number)
  product_ids?: number[]; // Product tags
}
