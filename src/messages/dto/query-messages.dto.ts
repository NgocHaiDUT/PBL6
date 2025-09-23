import { IsOptional, IsInt } from 'class-validator';

export class QueryMessagesDto {
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @IsInt()
  limit?: number = 20;
}