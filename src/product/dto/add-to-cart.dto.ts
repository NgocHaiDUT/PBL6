import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddToCartDto {
    @ApiProperty({
        description: 'Product ID to add to cart',
        example: 1
    })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    productId: number;

    @ApiPropertyOptional({
        description: 'Product variant ID (if applicable)',
        example: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    variantId?: number;

    @ApiProperty({
        description: 'Quantity to add',
        example: 2
    })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    quantity: number;
}
