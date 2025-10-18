import { IsOptional, IsString, IsBoolean, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryNotificationsDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  is_read?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 1 : parsed;
  })
  @IsInt({ message: 'Page must be a valid integer' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 20 : parsed;
  })
  @IsInt({ message: 'Limit must be a valid integer' })
  limit?: number = 20;
}