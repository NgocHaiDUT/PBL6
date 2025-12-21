import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
    @ApiProperty({
        description: 'Category name',
        example: 'Lipstick'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Category slug (URL-friendly name)',
        example: 'lipstick'
    })
    @IsString()
    @IsNotEmpty()
    slug: string;

    @ApiPropertyOptional({
        description: 'Parent category ID (for subcategories)',
        example: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    parent_id?: number;
}
