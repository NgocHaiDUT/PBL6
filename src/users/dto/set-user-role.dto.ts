import { IsInt, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetUserRoleDto {
  @ApiProperty({
    description: 'Role ID to assign to the user',
    example: 1
  })
  @IsInt()
  @IsNotEmpty()
  role_id: number;
}
