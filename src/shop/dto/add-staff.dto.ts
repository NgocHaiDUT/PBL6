import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class AddStaffDto {
  @ApiProperty({
    description: 'Email của nhân viên cần thêm vào shop',
    example: 'staff@example.com',
  })
  @IsEmail()
  staffEmail: string;

  @ApiProperty({
    description: 'Có phải là quản lý shop hay không',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isManager?: boolean;
}
