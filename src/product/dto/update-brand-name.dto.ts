import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBrandNameDto {
    @ApiProperty({
        description: 'New brand name',
        example: 'MAC Cosmetics Updated'
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}
