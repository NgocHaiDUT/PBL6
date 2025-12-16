import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt()
  product_id: number;

  @IsOptional()
  @IsInt()
  variant_id?: number;

  @IsInt()
  @Min(1)
  quantity: number;
}