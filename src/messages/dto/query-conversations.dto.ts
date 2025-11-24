import { IsOptional, IsInt } from 'class-validator';

export class QueryConversationsDto {
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @IsInt()
  limit?: number = 10;
}
