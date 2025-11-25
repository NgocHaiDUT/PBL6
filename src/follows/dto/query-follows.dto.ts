import { IsOptional, IsInt, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryFollowsDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = parseInt(value);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt({ message: 'User ID must be a valid integer' })
  user_id?: number;

  @IsOptional()
  @IsIn(['followers', 'following'], {
    message: 'Type must be either "followers" or "following"',
  })
  type?: 'followers' | 'following';

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
