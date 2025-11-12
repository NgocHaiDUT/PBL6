import { IsInt, IsOptional, IsString, IsArray, ValidateNested, IsNumber, IsBoolean, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class GetServicesDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  from_district: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  to_district: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  shop_id: number;
}

export class CalculateFeeItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  quantity: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  length?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  width?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  height?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  weight?: number;
}

export class CalculateFeeDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  from_district_id: number;

  @IsString()
  @IsNotEmpty()
  from_ward_code: string;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  to_district_id: number;

  @IsString()
  @IsNotEmpty()
  to_ward_code: string;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  service_id: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  service_type_id: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  height: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  length: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  width: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  weight: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  insurance_value?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cod_amount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalculateFeeItemDto)
  items?: CalculateFeeItemDto[];
}

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  quantity: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  length?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  width?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  height?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  category?: {
    level1?: string;
  };
}

export class CreateOrderDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  from_district_id: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  to_district_id: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  payment_type_id: number; // 1: Người bán/Người gửi, 2: Người mua/Người nhận

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsNotEmpty()
  required_note: string; // CHOTHUHANG, CHOXEMHANGKHONGTHU, KHONGCHOXEMHANG

  @IsString()
  @IsOptional()
  return_phone?: string;

  @IsString()
  @IsOptional()
  return_address?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  return_district_id?: number;

  @IsString()
  @IsOptional()
  return_ward_code?: string;

  @IsString()
  @IsOptional()
  client_order_code?: string;

  @IsString()
  @IsNotEmpty()
  from_name: string;

  @IsString()
  @IsNotEmpty()
  from_phone: string;

  @IsString()
  @IsNotEmpty()
  from_address: string;

  @IsString()
  @IsNotEmpty()
  from_ward_name: string;

  @IsString()
  @IsNotEmpty()
  from_district_name: string;

  @IsString()
  @IsNotEmpty()
  from_province_name: string;

  @IsString()
  @IsNotEmpty()
  to_name: string;

  @IsString()
  @IsNotEmpty()
  to_phone: string;

  @IsString()
  @IsNotEmpty()
  to_address: string;

  @IsString()
  @IsNotEmpty()
  to_ward_name: string;

  @IsString()
  @IsNotEmpty()
  to_district_name: string;

  @IsString()
  @IsNotEmpty()
  to_province_name: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cod_amount?: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  length?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  width?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  height?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  weight?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  insurance_value?: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  service_id: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  service_type_id: number; // 2: Hàng nhẹ, 5: Hàng nặng

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  @Type(() => Number)
  pick_shift?: number[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  pickup_time?: number; // UnixtimeStamp

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}

export class GetOrderDetailDto {
  @IsString()
  @IsNotEmpty()
  order_code: string;
}

export class CancelOrderDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  order_codes: string[];
}

export class UpdateOrderDto {
  @IsString()
  @IsNotEmpty()
  order_code: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  required_note?: string;

  @IsString()
  @IsOptional()
  to_name?: string;

  @IsString()
  @IsOptional()
  to_phone?: string;

  @IsString()
  @IsOptional()
  to_address?: string;

  @IsString()
  @IsOptional()
  to_ward_name?: string;

  @IsString()
  @IsOptional()
  to_district_name?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  cod_amount?: number;

  @IsString()
  @IsOptional()
  content?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  length?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  width?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  height?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  weight?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  insurance_value?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}

export class ReturnOrderDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  order_codes: string[];
}

export class GetLeadtimeDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  from_district_id: number;

  @IsString()
  @IsNotEmpty()
  from_ward_code: string;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  to_district_id: number;

  @IsString()
  @IsNotEmpty()
  to_ward_code: string;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  service_id: number;
}

export class GetPrintTokenDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  order_codes: string[];
}
