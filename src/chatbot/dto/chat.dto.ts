import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ChatDto {
  @ApiProperty({ 
    example: 'Xin chào, gợi ý sản phẩm skincare cho da dầu',
    description: 'Nội dung tin nhắn gửi tới bot'
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ 
    description: 'ID phiên chat nội bộ (nếu tiếp tục)', 
    example: 12 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionId?: number;
}
