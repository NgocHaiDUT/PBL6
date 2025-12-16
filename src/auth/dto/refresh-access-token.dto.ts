import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshAccessTokenDto {
  @ApiProperty({
    description: 'UUID of device',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @ApiProperty({
    description: 'Refresh Token',
    example: 'hjksafbashchjasbciywqediuqwbn',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
