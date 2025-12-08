import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Permission name',
    example: 'manage_products'
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
