import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBrandSlugDto {
    @ApiProperty({
        description: 'New brand slug (URL-friendly name)',
        example: 'mac-cosmetics-updated'
    })
    @IsString()
    @IsNotEmpty()
    slug: string;
}
