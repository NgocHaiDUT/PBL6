import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty()
  @IsNumber()
  userid: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsNotEmpty()
  @IsString()
  receiver_name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  province: string;

  @IsNotEmpty()
  @IsString()
  district: string;

  @IsNotEmpty()
  @IsString()
  ward: string;

  @IsNotEmpty()
  @IsString()
  street: string;

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
