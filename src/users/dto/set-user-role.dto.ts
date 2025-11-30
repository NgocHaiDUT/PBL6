import { IsInt, IsNotEmpty } from 'class-validator';

export class SetUserRoleDto {
  @IsInt()
  @IsNotEmpty()
  role_id: number;
}
