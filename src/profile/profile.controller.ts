import { Controller ,Post,Body,Get,UploadedFile, UploadedFiles, BadRequestException, Query} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
// Import local config instead of S3 config for development
import { localAvatarConfig, localBannerConfig, localLogoConfig } from './config/local-multer.config';
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

    @Post('update-story')
    async updateStory(@Body() body: { userId: string; story: string }) {
        if (!body?.userId) {
            throw new BadRequestException('userId is required');
        }
        return this.profileService.updatestory(Number(body.userId), body.story || '');
    }

    @Post('update-avatar')
    @UseInterceptors(FileInterceptor('file', localAvatarConfig))
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
        
        console.log('📁 [Avatar Upload] File info:', {
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
        });
        
        // For local storage, use filename. The service will convert it to full URL
        const avatarFilename = file.filename;
        const result = await this.profileService.updateavatar(Number(body.userId), avatarFilename);
        
        // Return the avatar URL in response
        return {
            ...result,
            avatarUrl: `/uploads/avatars/${avatarFilename}`
        };
    }

    @Post('add-address')
    async addAddress(@Body() body: { userid: string,label : string, receiver_name : string, phone : string, line1 : string, line2 : string, city : string,state : string,postal_code : string,country: string, is_default : boolean}) {
        if (!body?.userid) {
            throw new BadRequestException('userid is required');
        }
        return this.profileService.addaddress(Number(body.userid),body.label, body.receiver_name, body.phone, body.line1, body.line2, body.city, body.state, body.postal_code, body.country, body.is_default);
    }

    @Post('update-address')
    async updateAddress(@Body() body: { addressid: string,label : string, receiver_name : string, phone : string, line1 : string, line2 : string, city : string,state : string,postal_code : string,country: string, is_default : boolean}) {
        if (!body?.addressid) {
            throw new BadRequestException('addressid is required');
        }
        return this.profileService.updateaddress(Number(body.addressid),body.label, body.receiver_name, body.phone, body.line1, body.line2, body.city, body.state, body.postal_code, body.country, body.is_default);
    }

    @Get('all-address')
    async getAllAddress(@Query('userid') userid: string) {
        if (!userid) {
            throw new BadRequestException('userid is required');
        }
        return this.profileService.getaddresses(Number(userid));
    }

    @Post('delete-address')
    async deleteAddress(@Body() body: { addressid: string}) {
        if (!body?.addressid) {
            throw new BadRequestException('addressid is required');
        }
        return this.profileService.deleteaddress(Number(body.addressid));
    }

    @Post('create-shop')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'logo', maxCount: 1 },
            { name: 'banner', maxCount: 1 }
        ], {
          storage: localLogoConfig.storage,
          fileFilter: localLogoConfig.fileFilter,
          limits: localLogoConfig.limits,
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
            // S3 trả về full URL trong file.location
            logoUrl = (files.logo[0] as any).location;
        }

        if (files?.banner?.[0]) {
            // S3 trả về full URL trong file.location
            bannerUrl = (files.banner[0] as any).location;
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
    @UseInterceptors(FileInterceptor('file', localLogoConfig))
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
        // S3 trả về full URL trong file.location
        const logourl = file.location;
        return this.profileService.updatelogoshop(Number(body.shopid), logourl);
    }

    @Post('update-banner-shop')
    @UseInterceptors(FileInterceptor('file', localBannerConfig))
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
        // S3 trả về full URL trong file.location
        const bannerurl = file.location;
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

    @Get('user-info')
    async getUserInfo(@Query('userId') userId: string) {
        if (!userId) {
            throw new BadRequestException('userId is required');
        }
        return this.profileService.getUserInfo(Number(userId));
    }

}
