import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryConversationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;
}
