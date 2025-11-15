import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

class CartItemDto {
  @IsNumber()
  variant_id: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CalculateCartShippingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsOptional()
  @IsNumber()
  shipping_address_id?: number;
}
