import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBrandDto {
    @ApiProperty({
        description: 'Brand name',
        example: 'MAC Cosmetics'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Brand slug (URL-friendly name)',
        example: 'mac-cosmetics'
    })
    @IsString()
    @IsNotEmpty()
    slug: string;

    @ApiProperty({
        description: 'Brand logo image file',
        type: 'string',
        format: 'binary'
    })
    file: any;
}
