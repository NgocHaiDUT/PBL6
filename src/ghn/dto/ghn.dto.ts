import { IsNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class GetDistrictsDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  province_id: number;
}

export class GetWardsDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  district_id: number;
}
