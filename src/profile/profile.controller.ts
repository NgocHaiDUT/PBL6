import { Controller ,Post,Body,Get,UploadedFile, BadRequestException, Query} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import {avatarMulterConfig, bannershopMulterConfig, logoshopMulterConfig} from './config/avatar-multer.config';
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
    @UseInterceptors(FileInterceptor('file', avatarMulterConfig))

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
        const avatarUrl = `/uploads/avatars/${file.filename}`;
        return this.profileService.updateavatar(Number(body.userId), avatarUrl);
    }

    @Post('create-shop')
    async createshop(@Body() body: { userid: string, shop_name: string, slug: string, description: string, avatar_url: string, banner_url: string, phone: string, email: string}) {
        return this.profileService.createshop(Number(body.userid), body.shop_name, body.slug, body.description, body.avatar_url, body.banner_url, body.phone, body.email);
    }

    @Post('get-shop')
    async getshop(@Body() body: { userid: string}) {
        return this.profileService.getshopbyuserid(Number(body.userid));
    }

    @Post('update-logo-shop')
    @UseInterceptors(FileInterceptor('file', logoshopMulterConfig))

    async updatelogoshop(
        @Body() body: { shopid: string},
        @UploadedFile() file: any,
    ) {
        const logourl = `/uploads/logoshops/${file.filename}`;
        return this.profileService.updatelogoshop(Number(body.shopid), logourl);
    }

    @Post('update-banner-shop')
    @UseInterceptors(FileInterceptor('file', bannershopMulterConfig))

    async updatebannershop(
        @Body() body: { shopid: string},
        @UploadedFile() file: any,
    ) {
        const bannerurl = `/uploads/bannershops/${file.filename}`;
        return this.profileService.updatebannershop(Number(body.shopid), bannerurl);
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
