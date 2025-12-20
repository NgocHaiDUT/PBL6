import { IsOptional, IsString, IsInt, Min, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class GetShopProductsDto {
    @ApiPropertyOptional({
        description: 'Page number for pagination',
        example: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        example: 20,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @ApiPropertyOptional({
        description: 'Sort by field (name, price, created_at)',
        example: 'created_at',
    })
    @IsOptional()
    @IsString()
    sortBy?: string = 'created_at';

    @ApiPropertyOptional({
        description: 'Sort order (asc or desc)',
        example: 'desc',
    })
    @IsOptional()
    @IsString()
    order?: 'asc' | 'desc' = 'desc';

    @ApiPropertyOptional({
        description: 'Search products by name',
        example: 'lipstick',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by category ID',
        example: '1',
    })
    @IsOptional()
    @IsString()
    category_id?: string;

    @ApiPropertyOptional({
        description: 'Filter by brand ID',
        example: '2',
    })
    @IsOptional()
    @IsString()
    brand_id?: string;

    @ApiPropertyOptional({
        description: 'Filter by publication status',
        example: true,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    is_published?: boolean | string;

    @ApiPropertyOptional({
        description: 'Filter by moderation status',
        example: 'approved',
        enum: ['pending', 'approved', 'rejected'],
    })
    @IsOptional()
    @IsString()
    moderation_status?: 'pending' | 'approved' | 'rejected';
}
