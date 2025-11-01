import { IsString, IsOptional, IsInt, IsIn, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryCommentsDto {
  @IsString()
  @IsIn(['post', 'product'], { message: 'Target type must be either "post" or "product"' })
  target_type: string;

  @Transform(({ value }) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt({ message: 'Target ID must be a valid integer' })
  target_id: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = parseInt(value);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt({ message: 'Parent ID must be a valid integer' })
  parent_id?: number;

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

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean({ message: 'Include replies must be a boolean' })
  include_replies?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = parseInt(value);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt({ message: 'User ID must be a valid integer' })
  user_id?: number;
}