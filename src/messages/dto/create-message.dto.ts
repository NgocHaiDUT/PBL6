import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsInt()
  conversation_id: number;

  @IsString()
  content: string;
}