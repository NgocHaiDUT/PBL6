import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'UUID of device',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  device_id: string;

  @ApiProperty({
    description: 'Device type',
    example: 'mobile/web',
  })
  @IsString()
  @IsNotEmpty()
  device_type: string;
}
