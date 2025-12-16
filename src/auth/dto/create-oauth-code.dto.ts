import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOAuthCodeDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @ApiProperty({
    description: 'UUID of device',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  device_id: string;
}
