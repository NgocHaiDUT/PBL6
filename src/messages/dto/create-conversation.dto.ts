import { IsInt, IsArray, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateConversationDto {
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  participant_ids?: number[];

  @IsOptional()
  @IsInt()
  shop_id?: number; // Shop ID nếu muốn chat với shop

  @IsOptional()
  @IsString()
  @IsEnum(['private', 'group', 'user_shop'])
  type?: string = 'private';
}