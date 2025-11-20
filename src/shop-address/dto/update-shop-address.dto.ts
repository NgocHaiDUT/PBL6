import { IsBoolean, IsOptional, IsString, IsNumber, IsEmail } from 'class-validator';

export class UpdateShopAddressDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

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
}