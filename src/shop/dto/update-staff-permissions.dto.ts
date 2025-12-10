import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsArray, IsString } from 'class-validator';

export class UpdateStaffPermissionsDto {
  @ApiProperty({
    description: 'Email của nhân viên cần cập nhật quyền',
    example: 'staff@example.com',
  })
  @IsEmail()
  staffemail: string;

  @ApiProperty({
    description: 'ID của shop',
    example: 1,
  })
  @IsInt()
  shopid: number;

  @ApiProperty({
    description: 'Danh sách tên các quyền cần thêm/xóa',
    example: ['MANAGE_PRODUCTS', 'MANAGE_ORDERS'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
