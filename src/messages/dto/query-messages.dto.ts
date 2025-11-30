import { IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';

export class QueryMessagesDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  @IsInt()
  limit?: number = 20;

  // Cursor-based pagination (tối ưu hơn cho infinite scroll)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cursor?: number; // Message ID để load từ đó

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  before?: number; // Load tin nhắn trước message ID này (scroll lên)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  after?: number; // Load tin nhắn sau message ID này (scroll xuống)
}
