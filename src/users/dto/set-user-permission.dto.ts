import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetUserPermissionDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign to the user',
    example: [1, 2, 3],
    type: [Number]
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  permission_ids: number[];
}
