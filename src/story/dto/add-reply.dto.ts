import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AddReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}
