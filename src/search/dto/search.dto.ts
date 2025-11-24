import { IsString, IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SearchType {
  POST = 'post',
  USER = 'user',
  SHOP = 'shop',
  HASHTAG = 'hashtag',
  PRODUCT = 'product',
}

export class SearchQueryDto {
  @IsString()
  q: string; // Search query

  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType; // Filter by type

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AutocompleteDto {
  @IsString()
  q: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}
