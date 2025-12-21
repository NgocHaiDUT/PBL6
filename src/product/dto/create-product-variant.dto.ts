import { IsString, IsNotEmpty, IsInt, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
    @ApiProperty({
        description: 'Product ID this variant belongs to',
        example: 1
    })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    product_id: number;

    @ApiProperty({
        description: 'Stock Keeping Unit (unique identifier)',
        example: 'MAC-RW-001'
    })
    @IsString()
    @IsNotEmpty()
    sku: string;

    @ApiProperty({
        description: 'Variant name',
        example: 'Ruby Woo - Standard Size'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Price in VND',
        example: 450000
    })
    @Type(() => Number)
    @IsNumber()
    @IsNotEmpty()
    price: number;

    @ApiPropertyOptional({
        description: 'Stock quantity',
        example: 100,
        default: 0
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    stock?: number;

    @ApiPropertyOptional({
        description: 'Shade color in hex format',
        example: '#D10000'
    })
    @IsOptional()
    @IsString()
    shade_hex?: string;

    @ApiPropertyOptional({
        description: 'Size label',
        example: '3.0g'
    })
    @IsOptional()
    @IsString()
    size_label?: string;

    @ApiPropertyOptional({
        description: 'Original price for comparison',
        example: 500000
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    compare_at_price?: number;

    @ApiPropertyOptional({
        description: 'Opacity level (0-100)',
        example: 95
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    opacity?: number;

    @ApiPropertyOptional({
        description: 'Product weight in grams',
        example: 50
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    weight?: number;

    @ApiPropertyOptional({
        description: 'Product length in centimeters',
        example: 10
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    length?: number;

    @ApiPropertyOptional({
        description: 'Product width in centimeters',
        example: 5
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    width?: number;

    @ApiPropertyOptional({
        description: 'Product height in centimeters',
        example: 15
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    height?: number;
}
