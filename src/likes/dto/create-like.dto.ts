import { IsString, IsInt, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateLikeDto {
  @IsString()
  @IsIn(['post', 'product', 'comment'], {
    message: 'Target type must be either "post", "product", or "comment"',
  })
  target_type: string;

  @Transform(({ value }) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? value : parsed;
  })
  @IsInt({ message: 'Target ID must be a valid integer' })
  target_id: number;
}
