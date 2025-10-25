import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Type must not exceed 100 characters' })
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Body must not exceed 1000 characters' })
  body?: string;

  @IsOptional()
  @IsObject()
  meta_json?: object;
}