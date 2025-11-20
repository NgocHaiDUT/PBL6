import { IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryMessagesDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  limit?: number = 20;
}