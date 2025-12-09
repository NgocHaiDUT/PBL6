import { ApiProperty } from '@nestjs/swagger';

export class PermissionItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'view_users' })
  name: string;
}

export class PermissionGroupDto {
  @ApiProperty({ example: 'USER' })
  group: string;

  @ApiProperty({ example: 'User Management', description: 'Tên nhóm permission' })
  groupName: string;

  @ApiProperty({ example: 'Quản lý người dùng', description: 'Mô tả nhóm' })
  groupDescription: string;

  @ApiProperty({ type: [PermissionItemDto] })
  permissions: PermissionItemDto[];
}

export class GetAllPermissionsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [PermissionGroupDto] })
  data: PermissionGroupDto[];

  @ApiProperty({ 
    example: {
      total: 17,
      groups: 5
    }
  })
  metadata: {
    total: number;
    groups: number;
  };
}
