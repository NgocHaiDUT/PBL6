import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetRolePermissionDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign to the role',
    example: [1, 2, 3, 4, 5],
    type: [Number]
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  permission_ids: number[];
}
