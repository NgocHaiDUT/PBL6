import { IsOptional, IsInt, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryUsersDto {
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  role_id?: number;
}
