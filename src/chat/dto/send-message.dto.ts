import { IsString, IsInt, IsOptional, IsIn, IsObject } from 'class-validator';

enum MessageType {
  TEXT = 'TEXT',
  SHARE_POST = 'SHARE_POST',
  SHARE_PRODUCT = 'SHARE_PRODUCT',
}

export class SendMessageDto {
  @IsInt()
  senderId: number;

  @IsInt()
  receiverId: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(Object.values(MessageType))
  type?: MessageType;

  @IsOptional()
  @IsObject()
  payload?: any;
}