// src/makeup/dto/update-variant-shade.dto.ts
import { IsOptional, IsString, IsNumber, Min, Max, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVariantShadeDto {
  @ApiPropertyOptional({
    description: 'Mã màu hex (ví dụ: #FF5733)',
    example: '#FF5733',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'shade_hex phải là mã màu hex hợp lệ (ví dụ: #FF5733)',
  })
  shade_hex?: string;

  @ApiPropertyOptional({
    description: 'Độ trong suốt từ 0 đến 1',
    example: 0.65,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;
}
