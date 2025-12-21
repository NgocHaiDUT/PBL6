import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional, IsInt } from 'class-validator';

export class CreateRoleDto {
    @ApiProperty({
        description: 'Role name',
        example: 'content_moderator',
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Permission IDs to assign to this role',
        example: [1, 2, 3],
        required: false,
    })
    @IsArray()
    @IsInt({ each: true })
    @IsOptional()
    permission_ids?: number[];
}
