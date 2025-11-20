import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryReviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  product_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
