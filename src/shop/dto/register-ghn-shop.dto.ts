import { IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterGHNShopDto {
    @ApiProperty({
        description: 'ID of the shop address to use for GHN registration',
        example: 1,
    })
    @IsNotEmpty()
    @IsInt()
    address_shop_id: number;
}
