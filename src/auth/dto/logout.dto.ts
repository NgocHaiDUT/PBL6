import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'If true then logout all device',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @ApiPropertyOptional({
    description: 'Device ID need logout',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  device_id?: string;
}
