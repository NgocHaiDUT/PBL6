import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordFirstTimeDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Temporary password received via email',
    example: 'temp123456',
  })
  @IsString()
  @IsNotEmpty()
  temporaryPassword: string;

  @ApiProperty({
    description: 'New password to set (min 6 characters)',
    example: 'mynewpassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
