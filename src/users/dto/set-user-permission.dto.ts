import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetUserPermissionDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign to the user (can be empty to remove all user-specific permissions)',
    example: [1, 2, 3],
    type: [Number]
  })
  @IsArray()
  @IsInt({ each: true })
  permission_ids: number[];
}
