import { IsString, IsInt, IsOptional, IsIn, IsObject } from 'class-validator';
import { message_type } from '@prisma/client';

export class CreateMessageDto {
  @IsInt()
  conversation_id: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(Object.values(message_type))
  type?: message_type;

  @IsOptional()
  @IsObject()
  payload?: any;
}