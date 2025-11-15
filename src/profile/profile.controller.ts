import { Controller, Post, Body, Get, UploadedFile, BadRequestException, Query, UseGuards, Req, UploadedFiles,Param, ParseIntPipe } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { AuthGuard } from '@nestjs/passport';
import { ProfileService } from './profile.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { getMulterOptions } from '../config/storage.config';

import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get()
    getProfile(@Req() req: any) {
        // req.user is populated by JwtStrategy
        return this.profileService.getProfile(req.user.userId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    getMyProfile(@Req() req: any) {
        // Alias for /profile, commonly expected by frontend
        return this.profileService.getProfile(req.user.userId);
    }


    @Get('permission')
    @UseGuards(AuthGuard('jwt'))
    async getpermission(@Req() req: any){
        const userId = req.user.userId;
        return this.profileService.getPermissionbyuserid(userId);
    }

    @Get(':id')
    getProfileById(@Param('id', ParseIntPipe) id: number) {
        return this.profileService.getProfile(id);
    }

    @Post('update-fullname')
    @UseGuards(AuthGuard('jwt'))
    async updateFullname(@Body('fullName') fullName: string, @Req() req: any) {
        if (!fullName) {
            throw new BadRequestException('fullName is required');
        }
        const userId = req.user.userId;
        return this.profileService.updatefullname(userId, fullName);
    }

    @Post('update-phone')
    @UseGuards(AuthGuard('jwt'))
    async updatePhone(@Body('phone') phone: string, @Req() req: any) {
        if (!phone) {
            throw new BadRequestException('phone is required');
        }
        const userId = req.user.userId;
        return this.profileService.updatephone(userId, phone);
    }

    @Post('update-avatar')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file', getMulterOptions('avatars')))
    async updateAvatar(
        @UploadedFile() file: any,
        @Req() req: any
    ) {
        if (!file) {
            throw new BadRequestException('file is required');
        }
        const userId = req.user.userId;
        const avatarUrl = file.location || `/uploads/avatars/${file.filename}`;
        return this.profileService.updateavatar(userId, avatarUrl);
    }

    @Post('create-shop')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'logo', maxCount: 1 },
            { name: 'banner', maxCount: 1 }
        ], {
            storage: getMulterOptions('shops').storage,
            fileFilter: getMulterOptions('shops').fileFilter,
        })
    )
    async createshop(
        @Body() body: { 
            shop_name: string; 
            slug: string; 
            description: string; 
            phone: string; 
            email: string;
        },
        @UploadedFiles() files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
        @Req() req: any
    ) {
        const userId = req.user.userId;
        if (!body?.shop_name || !body?.slug) {
            throw new BadRequestException('shop_name and slug are required');
        }

        let logoUrl = '';
        let bannerUrl = '';

        if (files?.logo?.[0]) {
            logoUrl = (files.logo[0] as any).location || `/uploads/shops/${(files.logo[0] as any).filename}`;
        }

        if (files?.banner?.[0]) {
            bannerUrl = (files.banner[0] as any).location || `/uploads/shops/${(files.banner[0] as any).filename}`;
        }

        return this.profileService.createshop_temp(
            userId, 
            body.shop_name, 
            body.slug, 
            body.description || '', 
            logoUrl, 
            bannerUrl, 
            body.phone || '', 
            body.email || ''
        );
    }

    @Post('get-shop')
    async getshop(@Body() body: { userid: string}) {
        return this.profileService.getshopbyuserid(Number(body.userid));
    }

    @Post('update-logo-shop')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @RequirePermissions('edit_profile_shop')
    @UseInterceptors(FileInterceptor('file', getMulterOptions('shops')))
    async updatelogoshop(
        @Body('shopid', ParseIntPipe) shopid: number,
        @UploadedFile() file: any,
        @Req() req: any,
    ) {
        if (!file) {
            throw new BadRequestException('file is required');
        }
        const userId = req.user.userId;
        const logourl = file.location || `/uploads/shops/${file.filename}`;
        return this.profileService.updatelogoshop(userId, shopid, logourl);
    }

    @Post('update-banner-shop')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @RequirePermissions('edit_profile_shop')
    @UseInterceptors(FileInterceptor('file', getMulterOptions('shops')))
    async updatebannershop(
        @Body('shopid', ParseIntPipe) shopid: number,
        @UploadedFile() file: any,
        @Req() req: any,
    ) {
        if (!file) {
            throw new BadRequestException('file is required');
        }
        const userId = req.user.userId;
        const bannerurl = file.location || `/uploads/shops/${file.filename}`;
        return this.profileService.updatebannershop(userId, shopid, bannerurl);
    }

    @Post('update-phone-shop')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @RequirePermissions('edit_profile_shop')
    async updateshopphone(@Body() body: { shopid: number, phone: string}, @Req() req: any) {
        const userId = req.user.userId;
        return this.profileService.updatephoneshop(userId, body.shopid, body.phone);
    }

    @Post('update-email-shop')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @RequirePermissions('edit_profile_shop')
    async updateshopemail(@Body() body: { shopid: number, email: string}, @Req() req: any) {
        const userId = req.user.userId;
        return this.profileService.updateemailshop(userId, body.shopid, body.email);
    }

    @Post('update-description-shop')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @RequirePermissions('edit_profile_shop')
    async updateshopdescription(@Body() body: { shopid: number, description: string}, @Req() req: any) {
        const userId = req.user.userId;
        return this.profileService.updatedescriptionshop(userId, body.shopid, body.description);
    }
}
