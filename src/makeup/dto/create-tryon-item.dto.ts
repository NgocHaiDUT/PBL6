import { IsInt, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateTryonItemDto {
  @IsInt()
  session_id: number;

  @IsInt()
  @IsOptional()
  product_id?: number;

  @IsInt()
  @IsOptional()
  variant_id?: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsObject()
  @IsOptional()
  params_json?: any;
}
