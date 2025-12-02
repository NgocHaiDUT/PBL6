import { IsInt, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsArray()
  @IsInt({ each: true })
  participant_ids: number[];

  @IsOptional()
  @IsString()
  type?: string = 'private';
}
