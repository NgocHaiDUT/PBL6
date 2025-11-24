import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateLikeDto {
  @IsString()
  target_type: string = 'post';

  @IsInt()
  target_id: number;
}
