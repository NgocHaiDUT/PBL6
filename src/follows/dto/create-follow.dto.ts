import { IsInt, IsPositive, IsOptional } from 'class-validator';

export class CreateFollowDto {
  @IsInt({ message: 'Following ID must be a valid integer' })
  @IsPositive({ message: 'Following ID must be positive' })
  following_id: number;

  @IsOptional()
  @IsInt({ message: 'User ID must be a valid integer' })
  @IsPositive({ message: 'User ID must be positive' })
  user_id?: number;
}
