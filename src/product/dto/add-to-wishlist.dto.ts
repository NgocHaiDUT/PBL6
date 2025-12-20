import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddToWishlistDto {
    @ApiProperty({
        description: 'Product ID to add to wishlist',
        example: 1
    })
    @Type(() => Number)
    @IsInt()
    @IsNotEmpty()
    productId: number;
}
