import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
	@ApiProperty({
		description: 'Email address of the user',
		example: 'user@example.com'
	})
	@IsEmail()
	email: string;

	@ApiPropertyOptional({
		description: 'User password (min 6 characters)',
		example: 'password123',
		minLength: 6
	})
	@IsOptional()
	@IsString()
	@MinLength(6)
	password?: string;

	@ApiPropertyOptional({
		description: 'Full name of the user',
		example: 'Nguyen Van A'
	})
	@IsOptional()
	@IsString()
	full_name?: string;

	@ApiPropertyOptional({
		description: 'Phone number',
		example: '0912345678'
	})
	@IsOptional()
	@IsString()
	phone?: string;

	@ApiPropertyOptional({
		description: 'Avatar URL',
		example: 'https://example.com/avatar.jpg'
	})
	@IsOptional()
	@IsString()
	avatar_url?: string;

	@ApiPropertyOptional({
		description: 'Whether the user account is active',
		example: true,
		default: true
	})
	@IsOptional()
	@IsBoolean()
	is_active?: boolean;

	@ApiPropertyOptional({
		description: 'Whether this is first login',
		example: false,
		default: false
	})
	@IsOptional()
	@IsBoolean()
	firstlogin?: boolean;

	@ApiPropertyOptional({
		description: 'Role ID to assign to the user',
		example: 1
	})
	@IsOptional()
	@IsInt()
	role_id?: number;
}
