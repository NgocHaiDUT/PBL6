import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsNumber, IsEmail } from 'class-validator';

export class CreateShopAddressDto {
  @IsNotEmpty()
  @IsNumber()
  shop_id: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

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
}