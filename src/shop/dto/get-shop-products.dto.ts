import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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
}
