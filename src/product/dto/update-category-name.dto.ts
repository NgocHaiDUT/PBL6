import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryNameDto {
    @ApiProperty({
        description: 'New category name',
        example: 'Matte Lipstick'
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}
