import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductVariantDto } from './create-product-variant.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductVariantDto extends PartialType(
    OmitType(CreateProductVariantDto, ['product_id'] as const)
) {
    @ApiPropertyOptional({
        description: 'Whether the variant is active',
        example: true
    })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
