import { IsInt, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @IsInt()
  product_id: number;

  @IsOptional()
  @IsInt()
  variant_id?: number;

  @IsInt()
  @Min(1)
  quantity: number;
}