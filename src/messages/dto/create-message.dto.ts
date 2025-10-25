import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsOptional()
  @IsInt()
  conversation_id?: number;

  @IsOptional()
  @IsInt()
  sender_id?: number;

  @IsOptional()
  @IsInt()
  receiver_id?: number;

  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  postId?: number;

  @IsOptional()
  @IsString()
  messageType?: string;
}