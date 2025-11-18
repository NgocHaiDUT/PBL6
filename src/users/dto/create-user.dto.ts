import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
	@IsEmail()
	email: string;

	@IsOptional()
	@IsString()
	@MinLength(6)
	password?: string;

	@IsOptional()
	@IsString()
	full_name?: string;

	@IsOptional()
	@IsString()
	phone?: string;

	@IsOptional()
	@IsString()
	avatar_url?: string;

	@IsOptional()
	@IsBoolean()
	is_active?: boolean;

	@IsOptional()
	@IsBoolean()
	firstlogin?: boolean;

	@IsOptional()
	@IsInt()
	role_id?: number;
}
