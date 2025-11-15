import { IsNotEmpty, IsInt, IsString } from 'class-validator';

export class RegisterShopDto {
  @IsNotEmpty()
  @IsInt()
  district_id: number;

  @IsNotEmpty()
  @IsString()
  ward_code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  address: string;
}
