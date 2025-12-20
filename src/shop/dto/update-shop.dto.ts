import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';

export class UpdateShopDto {
  @ApiProperty({
    description: 'Tên cửa hàng',
    example: 'Beauty Store 2024',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Mô tả về cửa hàng',
    example: 'Cửa hàng bán mỹ phẩm chính hãng',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL logo cửa hàng',
    example: 'https://example.com/logo.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  logo_url?: string;

  @ApiProperty({
    description: 'URL ảnh bìa cửa hàng',
    example: 'https://example.com/cover.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  cover_url?: string;

  @ApiProperty({
    description: 'Số điện thoại liên hệ',
    example: '0912345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'Email liên hệ',
    example: 'contact@shop.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}
