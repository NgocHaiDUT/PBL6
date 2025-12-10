import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsNumber, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShopAddressDto {
  @ApiProperty({ 
    description: 'Shop ID', 
    example: 5,
    type: Number 
  })
  @IsNotEmpty()
  @IsNumber()
  shop_id: number;

  @ApiProperty({ 
    description: 'Address/warehouse name', 
    example: 'Main Warehouse',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Contact phone number', 
    example: '0123456789',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ 
    description: 'Contact email', 
    example: 'warehouse@shop.com',
    type: String 
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ 
    description: 'Province/City', 
    example: 'Ho Chi Minh City',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  province: string;

  @ApiProperty({ 
    description: 'District', 
    example: 'District 1',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  district: string;

  @ApiProperty({ 
    description: 'Ward/Commune', 
    example: 'Ben Nghe Ward',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  ward: string;

  @ApiProperty({ 
    description: 'Street address', 
    example: '123 Le Loi Street',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  street: string;

  @ApiPropertyOptional({ 
    description: 'Set as default shop address', 
    example: true,
    type: Boolean,
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({ 
    description: 'Province/City ID from GHN API', 
    example: 202,
    type: Number 
  })
  @IsOptional()
  @IsNumber()
  ghn_province_id?: number;

  @ApiPropertyOptional({ 
    description: 'District ID from GHN API', 
    example: 1442,
    type: Number 
  })
  @IsOptional()
  @IsNumber()
  ghn_district_id?: number;

  @ApiPropertyOptional({ 
    description: 'Ward code from GHN API', 
    example: '21012',
    type: String 
  })
  @IsOptional()
  @IsString()
  ghn_ward_code?: string;
}
