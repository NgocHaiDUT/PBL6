import { IsInt, IsString, IsOptional, Min, Max, IsBoolean } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  product_id: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  media_url?: string;

  @IsOptional()
  @IsBoolean()
  is_verified_purchase?: boolean;
}
