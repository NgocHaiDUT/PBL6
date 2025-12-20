import { IsOptional, IsInt, IsString, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryProductsDto {
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
        description: 'Filter by category slug',
        example: 'lipstick'
    })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({
        description: 'Filter by brand slug',
        example: 'mac-cosmetics'
    })
    @IsOptional()
    @IsString()
    brand?: string;

    @ApiPropertyOptional({
        description: 'Minimum price filter',
        example: 100000
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    minPrice?: number;

    @ApiPropertyOptional({
        description: 'Maximum price filter',
        example: 1000000
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    maxPrice?: number;

    @ApiPropertyOptional({
        description: 'Minimum rating filter (0-5)',
        example: 4.0
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    minRating?: number;
}
