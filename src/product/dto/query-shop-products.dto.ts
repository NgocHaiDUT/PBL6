import { IsOptional, IsInt, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryShopProductsDto {
    @ApiPropertyOptional({
        description: 'Page number',
        example: 1,
        default: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        example: 20,
        default: 20
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    limit?: number = 20;

    @ApiPropertyOptional({
        description: 'Search by product name',
        example: 'lipstick'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by category ID',
        example: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    category_id?: number;

    @ApiPropertyOptional({
        description: 'Filter by brand ID',
        example: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    brand_id?: number;

    @ApiPropertyOptional({
        description: 'Filter by published status',
        example: true
    })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    is_published?: boolean;

    @ApiPropertyOptional({
        description: 'Minimum price filter',
        example: 100000
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    min_price?: number;

    @ApiPropertyOptional({
        description: 'Maximum price filter',
        example: 1000000
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    max_price?: number;

    @ApiPropertyOptional({
        description: 'Sort field',
        example: 'created_at',
        enum: ['created_at', 'updated_at', 'name', 'avg_rating', 'review_count']
    })
    @IsOptional()
    @IsString()
    sort_field?: string;

    @ApiPropertyOptional({
        description: 'Sort order',
        example: 'desc',
        enum: ['asc', 'desc']
    })
    @IsOptional()
    @IsString()
    sort_order?: 'asc' | 'desc';
}
