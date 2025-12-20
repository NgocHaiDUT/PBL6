import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddProductMediaDto {
    @ApiPropertyOptional({
        description: 'Media type',
        example: 'image',
        default: 'image',
        enum: ['image', 'video']
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiPropertyOptional({
        description: 'Sort order for media display',
        example: 0,
        default: 0
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    sort_order?: number;

    @ApiProperty({
        description: 'Media file (image or video)',
        type: 'string',
        format: 'binary'
    })
    file: any;
}
