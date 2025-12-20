import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategorySlugDto {
    @ApiProperty({
        description: 'New category slug (URL-friendly name)',
        example: 'matte-lipstick'
    })
    @IsString()
    @IsNotEmpty()
    slug: string;
}
