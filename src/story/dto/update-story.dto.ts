import { IsString, IsOptional } from 'class-validator';

export class UpdateStoryDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  background_color?: string;

  @IsOptional()
  @IsString()
  text_color?: string;

  @IsOptional()
  @IsString()
  text_position?: string;
}
