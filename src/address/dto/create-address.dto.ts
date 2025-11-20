import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  // ✅ Removed userid - will be taken from JWT token in controller

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
}