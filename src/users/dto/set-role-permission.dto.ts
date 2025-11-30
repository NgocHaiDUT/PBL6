import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class SetRolePermissionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  permission_ids: number[];
}
