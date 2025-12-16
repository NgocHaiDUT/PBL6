import { IsEmail, IsString } from 'class-validator';

export class VerifyDeviceOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  device_id: string;

  @IsString()
  device_name: string;

  @IsString()
  otp: string;
}
