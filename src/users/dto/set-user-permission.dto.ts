import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';

export class SetUserPermissionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  permission_ids: number[];
}
