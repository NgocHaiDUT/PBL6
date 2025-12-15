import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt } from 'class-validator';

export class RemoveStaffDto {
  @ApiProperty({
    description: 'Email của nhân viên cần xóa khỏi shop',
    example: 'staff@example.com',
  })
  @IsEmail()
  staffEmail: string;

  @ApiProperty({
    description: 'ID của shop',
    example: 1,
  })
  @IsInt()
  shopId: number;
}
