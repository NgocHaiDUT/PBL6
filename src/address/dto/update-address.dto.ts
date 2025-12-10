import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiProperty({ 
    description: 'Address ID to update', 
    example: 1,
    type: Number 
  })
  @IsNotEmpty()
  @IsNumber()
  addressid: number;

  @ApiPropertyOptional({ 
    description: 'Address label/name', 
    example: 'Office',
    type: String 
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ 
    description: 'Receiver name', 
    example: 'Jane Smith',
    type: String 
  })
  @IsOptional()
  @IsString()
  receiver_name?: string;

  @ApiPropertyOptional({ 
    description: 'Receiver phone number', 
    example: '0987654321',
    type: String 
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ 
    description: 'Province/City', 
    example: 'Hanoi',
    type: String 
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ 
    description: 'District', 
    example: 'Ba Dinh District',
    type: String 
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ 
    description: 'Ward/Commune', 
    example: 'Dien Bien Ward',
    type: String 
  })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ 
    description: 'Street address', 
    example: '456 Hoang Dieu Street',
    type: String 
  })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ 
    description: 'Set as default address', 
    example: false,
    type: Boolean 
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({ 
    description: 'Province/City ID from GHN API', 
    example: 201,
    type: Number 
  })
  @IsOptional()
  @IsNumber()
  ghn_province_id?: number;

  @ApiPropertyOptional({ 
    description: 'District ID from GHN API', 
    example: 1484,
    type: Number 
  })
  @IsOptional()
  @IsNumber()
  ghn_district_id?: number;

  @ApiPropertyOptional({ 
    description: 'Ward code from GHN API', 
    example: '1A0203',
    type: String 
  })
  @IsOptional()
  @IsString()
  ghn_ward_code?: string;
}
