import { Controller, Post, Body, Get, UploadedFile, BadRequestException, Query, UseGuards, Req, UploadedFiles,Param, ParseIntPipe, Optional } from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileService } from './profile.service';
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

    @Get('permission')
    @UseGuards(AuthGuard('jwt'))
    async getpermission(@Req() req: any){
        const userId = req.user.userId;
        return this.profileService.getPermissionbyuserid(userId);
    }

    // ✅ IMPORTANT: Specific routes MUST come BEFORE dynamic :id route
    @Get('user-info')
    @UseGuards(AuthGuard('jwt'))
    async getUserInfo(
        @Query('userId') userIdRaw?: string,
        @Req() req?: any
    ) {
        console.log('🔍 [getUserInfo] Received raw userId:', userIdRaw, 'Type:', typeof userIdRaw);
        
        let userId: number | undefined;
        
        // Try to parse userId from query param
        if (userIdRaw) {
            const parsed = parseInt(userIdRaw, 10);
            if (!isNaN(parsed)) {
                userId = parsed;
            }
        }
        
        // If userId not provided or invalid, get from JWT token
        if (!userId) {
            userId = req?.user?.sub || req?.user?.userId;
            console.log('🔍 [getUserInfo] Using JWT userId:', userId);
        }
        
        if (!userId || isNaN(userId)) {
            console.error('❌ [getUserInfo] Invalid userId:', { userIdRaw, userId, user: req?.user });
            throw new BadRequestException(`Invalid or missing userId. Received: ${userIdRaw}`);
        }
        
        console.log('✅ [getUserInfo] Fetching user info for userId:', userId);
        return this.profileService.getUserInfo(userId);
    }

    // ✅ NEW ENDPOINT - Temporary workaround for caching issue
    @Get('user-info-v2')
    @UseGuards(AuthGuard('jwt'))
    async getUserInfoV2(
        @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
        @Req() req?: any
    ) {
        console.log('🔍 [getUserInfoV2] ===== V2 ENDPOINT =====');
        console.log('🔍 [getUserInfoV2] Received userId:', userId, 'Type:', typeof userId);
        
        // If userId not provided in query, get from JWT token
        if (!userId) {
            userId = req?.user?.sub || req?.user?.userId;
        }
        
        if (!userId || isNaN(userId)) {
            throw new BadRequestException(`Invalid or missing userId. Received: ${userId}`);
        }
        
        console.log('✅ [getUserInfoV2] Fetching user info for userId:', userId);
        return this.profileService.getUserInfo(userId);
    }

    // ✅ Dynamic :id route MUST be LAST among GET routes
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

    @Post('update-story')
    @UseGuards(AuthGuard('jwt'))
    async updateStory(@Body('story') story: string, @Req() req: any) {
        const userId = req.user.userId;
        return this.profileService.updatestory(userId, story || '');
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

    @Post('add-address')
    @UseGuards(AuthGuard('jwt'))
    async addAddress(@Body() body: { label: string, receiver_name: string, phone: string, province: string, district: string, ward: string, street: string, is_default: boolean}, @Req() req: any) {
        const userId = req.user.userId;
        return this.profileService.addaddress(userId, body.label, body.receiver_name, body.phone, body.province, body.district, body.ward, body.street, body.is_default);
    }

    @Post('update-address')
    @UseGuards(AuthGuard('jwt'))
    async updateAddress(@Body() body: { addressid: string, label: string, receiver_name: string, phone: string, province: string, district: string, ward: string, street: string, is_default: boolean}, @Req() req: any) {
        if (!body?.addressid) {
            throw new BadRequestException('addressid is required');
        }
        return this.profileService.updateaddress(Number(body.addressid), body.label, body.receiver_name, body.phone, body.province, body.district, body.ward, body.street, body.is_default);
    }

    @Get('all-address')
    @UseGuards(AuthGuard('jwt'))
    async getAllAddress(@Req() req: any) {
        const userId = req.user.userId;
        return this.profileService.getaddresses(userId);
    }

    @Post('delete-address')
    @UseGuards(AuthGuard('jwt'))
    async deleteAddress(@Body() body: { addressid: string}, @Req() req: any) {
        if (!body?.addressid) {
            throw new BadRequestException('addressid is required');
        }
        return this.profileService.deleteaddress(Number(body.addressid));
    }

    @Post('create-shop')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @RequirePermissions('create_shop')
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

        return this.profileService.createshop(
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
    @UseGuards(AuthGuard('jwt'))
    async getshop(@Req() req: any) {
        const userId = req.user.userId;
        return this.profileService.getshopbyuserid(userId);
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

