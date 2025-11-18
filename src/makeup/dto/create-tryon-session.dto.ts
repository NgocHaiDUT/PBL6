import { IsString, IsOptional } from 'class-validator';

export class CreateTryonSessionDto {
  @IsString()
  @IsOptional()
  device?: string;

  @IsString()
  @IsOptional()
  input_type?: string;

  @IsString()
  @IsOptional()
  input_image_url?: string;
}
