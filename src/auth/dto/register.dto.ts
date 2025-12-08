import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'Nguyen Van A'
  })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '0912345678'
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
