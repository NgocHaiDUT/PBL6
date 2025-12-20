import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsInt, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateProductDto {
    @ApiProperty({
        description: 'Shop ID that owns this product',
        example: 1
    })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    shop_id: number;

    @ApiProperty({
        description: 'Product name',
        example: 'Ruby Woo Lipstick'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({
        description: 'Product slug (URL-friendly name)',
        example: 'ruby-woo-lipstick'
    })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiProperty({
        description: 'Whether the product is published',
        example: true,
        default: false
    })
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean()
    is_published: boolean;

    @ApiPropertyOptional({
        description: 'How to use the product',
        example: 'Apply directly to lips for a bold, matte finish'
    })
    @IsOptional()
    @IsString()
    how_to_use?: string;

    @ApiPropertyOptional({
        description: 'Product description',
        example: 'A classic blue-red matte lipstick with long-lasting formula'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Brand ID',
        example: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    brand_id?: number;

    @ApiPropertyOptional({
        description: 'Array of category IDs',
        example: [1, 2, 3],
        type: [Number]
    })
    @IsOptional()
    @IsArray()
    @Type(() => Number)
    category_ids?: number[];
}
