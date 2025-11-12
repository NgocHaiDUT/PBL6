import { Controller ,Post,Body,Get,UploadedFile, UploadedFiles, BadRequestException, Query} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
// Import local file config for local testing
// import { s3AvatarConfig, s3LogoShopConfig, s3BannerShopConfig, s3CreateShopConfig } from './config/s3-multer.config';
import { avatarMulterConfig, logoshopMulterConfig, bannershopMulterConfig, createShopMulterConfig } from './config/avatar-multer.config';
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
        // Local storage - construct relative path
        const avatarUrl = `/uploads/avatars/${file.filename}`;
        return this.profileService.updateavatar(Number(body.userId), avatarUrl);
    }

    @Post('create-shop')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'logo', maxCount: 1 },
            { name: 'banner', maxCount: 1 }
        ], createShopMulterConfig)
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
            // Local storage - construct relative path
            logoUrl = `/uploads/logoshops/${files.logo[0].filename}`;
        }

        if (files?.banner?.[0]) {
            // Local storage - construct relative path
            bannerUrl = `/uploads/bannershops/${files.banner[0].filename}`;
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
    @UseInterceptors(FileInterceptor('file', logoshopMulterConfig))
    async updatelogoshop(
        @Body() body: { shopid: string,userid: string},
        @UploadedFile() file: any,
    ) {
        if (!body?.shopid) {
            throw new BadRequestException('shopid is required');
        }
        if (!file) {
            throw new BadRequestException('file is required');
        }
        // Local storage - construct relative path
        const logourl = `/uploads/logoshops/${file.filename}`;
        return this.profileService.updatelogoshop(Number(body.userid),Number(body.shopid), logourl);
    }

    @Post('update-banner-shop')
    @UseInterceptors(FileInterceptor('file', bannershopMulterConfig))
    async updatebannershop(
        @Body() body: { shopid: string,userid : string},
        @UploadedFile() file: any,
    ) {
        if (!body?.shopid) {
            throw new BadRequestException('shopid is required');
        }
        if (!file) {
            throw new BadRequestException('file is required');
        }
        // Local storage - construct relative path
        const bannerurl = `/uploads/bannershops/${file.filename}`;
        return this.profileService.updatebannershop(Number(body.userid), Number(body.shopid), bannerurl);
    }

    @Post('update-phone-shop')
    async updateshopphone(@Body() body: { shopid: string, phone: string,userid: string}) {
        return this.profileService.updatephoneshop(Number(body.userid),Number(body.shopid), body.phone);
    }

    @Post('update-email-shop')
    async updateshopemail(@Body() body: { shopid: string, email: string,userid: string}) {
        return this.profileService.updateemailshop(Number(body.userid),Number(body.shopid), body.email);
    }

    @Post('update-description-shop')
    async updateshopdescription(@Body() body: { shopid: string, description: string,userid: string}) {
        return this.profileService.updatedescriptionshop(Number(body.userid),Number(body.shopid), body.description);
    }

    @Post('permission')
    async getpermission(@Body() body: {userid : string}){
        return this.profileService.getPermissionbyuserid(Number(body.userid));
    }
        

}
