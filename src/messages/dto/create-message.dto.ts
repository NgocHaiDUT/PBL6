import { IsString, IsInt, IsOptional, IsIn, IsObject } from 'class-validator';
import { message_type } from '@prisma/client';

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

  @IsOptional()
  @IsString()
  content: string;

  @IsOptional()
  @IsInt()
  postId?: number;

  @IsOptional()
  @IsInt()
  sharedProfileId?: number;

  @IsOptional()
  messageType?: message_type;

  @IsOptional()
  @IsObject()
  payload?: any;
}
