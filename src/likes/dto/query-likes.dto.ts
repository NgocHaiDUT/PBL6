import { IsString, IsOptional, IsInt, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryLikesDto {
  @IsOptional()
  @IsString()
  @IsIn(['post', 'product', 'comment'], {
    message: 'Target type must be either "post", "product", or "comment"',
  })
  target_type?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = parseInt(value);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt({ message: 'Target ID must be a valid integer' })
  target_id?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = parseInt(value);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt({ message: 'User ID must be a valid integer' })
  user_id?: number;

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
