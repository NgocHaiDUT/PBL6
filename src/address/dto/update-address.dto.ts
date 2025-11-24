import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class UpdateAddressDto {
  @IsNotEmpty()
  @IsNumber()
  addressid: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  receiver_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsNumber()
  ghn_province_id?: number;

  @IsOptional()
  @IsNumber()
  ghn_district_id?: number;

  @IsOptional()
  @IsString()
  ghn_ward_code?: string;
}
