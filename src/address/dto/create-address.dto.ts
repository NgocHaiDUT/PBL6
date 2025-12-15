import { IsBoolean, IsNotEmpty, IsOptional, IsString , IsNumber} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  // ✅ Removed userid - will be taken from JWT token in controller

  @ApiPropertyOptional({ 
    description: 'Address label/name', 
    example: 'Home',
    type: String 
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ 
    description: 'Receiver name', 
    example: 'John Doe',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  receiver_name: string;

  @ApiProperty({ 
    description: 'Receiver phone number', 
    example: '0123456789',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

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
    description: 'Set as default address', 
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
