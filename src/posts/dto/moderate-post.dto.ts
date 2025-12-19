import { IsEnum, IsOptional, IsString } from 'class-validator';
import { moderation_status } from '@prisma/client';

export class ModeratePostDto {
    @IsEnum(moderation_status)
    action: moderation_status; // 'approved' | 'rejected' | 'removed'

    @IsOptional()
    @IsString()
    reason?: string; // Optional reason for rejection
}
