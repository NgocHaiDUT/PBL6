import { Controller, Post, Body, Get, UploadedFile, BadRequestException, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileService } from './profile.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { getMulterOptions } from '../config/storage.config';

@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Post('update-fullname')
    async updateFullname(@Body() body: { userId: string; fullName: string }) {
        if (!body?.userId || !body?.fullName) {
            throw new BadRequestException('userId and fullName are required');
        }
        return this.profileService.updatefullname(Number(body.userId), body.fullName);
    }

    @Post('update-phone')
    async updatePhone(@Body() body: { userId: string; phone: string }) {
        if (!body?.userId || !body?.phone) {
            throw new BadRequestException('userId and phone are required');
        }
        return this.profileService.updatephone(Number(body.userId), body.phone);
    }

    @Post('update-avatar')
    @UseInterceptors(FileInterceptor('file', getMulterOptions('avatars')))
    async updateAvatar(
        @Body() body: { userId: string},
        @UploadedFile() file: any,
    ) {
        if (!body?.userId) {
            throw new BadRequestException('userId is required');
        }
        if (!file) {
            throw new BadRequestException('file is required');
        }
        const avatarUrl = file.location || `/uploads/avatars/${file.filename}`;
        return this.profileService.updateavatar(Number(body.userId), avatarUrl);
    }

    @Post('create-shop')
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
            userid: string; 
            shop_name: string; 
            slug: string; 
            description: string; 
            phone: string; 
            email: string;
        },
        @UploadedFiles() files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] }
    ) {
        if (!body?.userid || !body?.shop_name || !body?.slug) {
            throw new BadRequestException('userid, shop_name, and slug are required');
        }

        let logoUrl = '';
        let bannerUrl = '';

        if (files?.logo?.[0]) {
            logoUrl = (files.logo[0] as any).location || `/uploads/shops/${(files.logo[0] as any).filename}`;
        }

        if (files?.banner?.[0]) {
            bannerUrl = (files.banner[0] as any).location || `/uploads/shops/${(files.banner[0] as any).filename}`;
        }

        return this.profileService.createshop(
            Number(body.userid), 
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
    @UseInterceptors(FileInterceptor('file', getMulterOptions('shops')))
    async updatelogoshop(
        @Body() body: { shopid: string},
        @UploadedFile() file: any,
    ) {
        if (!body?.shopid) {
            throw new BadRequestException('shopid is required');
        }
        if (!file) {
            throw new BadRequestException('file is required');
        }
        const logourl = file.location || `/uploads/shops/${file.filename}`;
        return this.profileService.updatelogoshop(Number(body.shopid), logourl);
    }

    @Post('update-banner-shop')
    @UseInterceptors(FileInterceptor('file', getMulterOptions('shops')))
    async updatebannershop(
        @Body() body: { shopid: string},
        @UploadedFile() file: any,
    ) {
        if (!body?.shopid) {
            throw new BadRequestException('shopid is required');
        }
        if (!file) {
            throw new BadRequestException('file is required');
        }
        const bannerurl = file.location || `/uploads/shops/${file.filename}`;
        return this.profileService.updatebannershop(Number(body.shopid), bannerurl);
    }
}

    @Post('update-phone-shop')
    async updateshopphone(@Body() body: { shopid: string, phone: string}) {
        return this.profileService.updatephoneshop(Number(body.shopid), body.phone);
    }

    @Post('update-email-shop')
    async updateshopemail(@Body() body: { shopid: string, email: string}) {
        return this.profileService.updateemailshop(Number(body.shopid), body.email);
    }

    @Post('update-description-shop')
    async updateshopdescription(@Body() body: { shopid: string, description: string}) {
        return this.profileService.updatedescriptionshop(Number(body.shopid), body.description);
    }

    

}
