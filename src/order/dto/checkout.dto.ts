import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CalculateCartShippingDto } from './calculate-shipping.dto';

// We can reuse the CartItemDto from the calculate-shipping DTO, but let's define it here
// for clarity in case they diverge in the future.
class CheckoutItemDto {
  @IsNumber()
  variant_id: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}

export class CheckoutDto {
  @IsNumber()
  @IsNotEmpty()
  shipping_address_id: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  payment_method?: string; // 'cod' | 'online'

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];
}

export class QueryOrdersDto {
  page?: number;
  limit?: number;
  status?: string;
}
