import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Put,
  Delete,
  UploadedFile,
  BadRequestException,
  Query,
  UseGuards,
  Req,
  UploadedFiles,
  Param,
  ParseIntPipe,
  Optional,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfileService } from './profile.service';
import { getMulterOptions, getFileUrl } from '../config/storage.config';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('users')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@Req() req: any) {
    const profile = await this.profileService.getProfile(req.user.userId);
    return profile;
  }

  @Get('user-info')
  @UseGuards(JwtAuthGuard)
  async getUserInfo(@Query('userId') userIdRaw?: string, @Req() req?: any) {
    console.log(
      '🔍 [getUserInfo] Received raw userId:',
      userIdRaw,
      'Type:',
      typeof userIdRaw,
    );

    let userId: number | undefined;

    if (userIdRaw) {
      const parsed = parseInt(userIdRaw, 10);
      if (!isNaN(parsed)) {
        userId = parsed;
      }
    }

    if (!userId) {
      userId = req?.user?.sub || req?.user?.userId;
      console.log('🔍 [getUserInfo] Using JWT userId:', userId);
    }

    if (!userId || isNaN(userId)) {
      console.error('❌ [getUserInfo] Invalid userId:', {
        userIdRaw,
        userId,
        user: req?.user,
      });
      throw new BadRequestException(
        `Invalid or missing userId. Received: ${userIdRaw}`,
      );
    }

    console.log('✅ [getUserInfo] Fetching user info for userId:', userId);
    return this.profileService.getUserInfo(userId);
  }

  @Get('user-info-v2')
  @UseGuards(JwtAuthGuard)
  async getUserInfoV2(
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
    @Req() req?: any,
  ) {
    console.log('🔍 [getUserInfoV2] ===== V2 ENDPOINT =====');
    console.log(
      '🔍 [getUserInfoV2] Received userId:',
      userId,
      'Type:',
      typeof userId,
    );

    if (!userId) {
      userId = req?.user?.sub || req?.user?.userId;
    }

    if (!userId || isNaN(userId)) {
      throw new BadRequestException(
        `Invalid or missing userId. Received: ${userId}`,
      );
    }

    console.log('✅ [getUserInfoV2] Fetching user info for userId:', userId);
    return this.profileService.getUserInfo(userId);
  }

  @Patch('me/full-name')
  @UseGuards(JwtAuthGuard)
  async updateFullname(@Body('fullName') fullName: string, @Req() req: any) {
    if (!fullName) {
      throw new BadRequestException('fullName is required');
    }
    const userId = req.user.userId;
    return this.profileService.updatefullname(userId, fullName);
  }

  @Patch('me/phone')
  @UseGuards(JwtAuthGuard)
  async updatePhone(@Body('phone') phone: string, @Req() req: any) {
    if (!phone) {
      throw new BadRequestException('phone is required');
    }
    const userId = req.user.userId;
    return this.profileService.updatephone(userId, phone);
  }

  @Patch('me/story')
  @UseGuards(JwtAuthGuard)
  async updateStory(@Body('story') story: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.profileService.updatestory(userId, story || '');
  }

  @Post('me/avatar') // ✅ Changed from @Patch to @Post for file upload
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', getMulterOptions('avatars')))
  async updateAvatar(@UploadedFile() file: any, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const userId = req.user.userId;
    const avatarUrl = getFileUrl(file, 'avatars');
    return this.profileService.updateavatar(userId, avatarUrl);
  }

  @Post('me/addresses')
  @UseGuards(JwtAuthGuard)
  async addAddress(
    @Body()
    body: {
      label: string;
      receiver_name: string;
      phone: string;
      province: string;
      district: string;
      ward: string;
      street: string;
      is_default: boolean;
    },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.profileService.addaddress(
      userId,
      body.label,
      body.receiver_name,
      body.phone,
      body.province,
      body.district,
      body.ward,
      body.street,
      body.is_default,
    );
  }

  @Put('me/addresses/:addressId')
  @UseGuards(JwtAuthGuard)
  async updateAddress(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Body()
    body: {
      label: string;
      receiver_name: string;
      phone: string;
      province: string;
      district: string;
      ward: string;
      street: string;
      is_default: boolean;
    },
    @Req() req: any,
  ) {
    return this.profileService.updateaddress(
      addressId,
      body.label,
      body.receiver_name,
      body.phone,
      body.province,
      body.district,
      body.ward,
      body.street,
      body.is_default,
    );
  }

  @Get('me/addresses')
  @UseGuards(JwtAuthGuard)
  async getAllAddress(@Req() req: any) {
    const userId = req.user.userId;
    return this.profileService.getaddresses(userId);
  }

  @Delete('me/addresses/:addressId')
  @UseGuards(JwtAuthGuard)
  async deleteAddress(
    @Param('addressId', ParseIntPipe) addressId: number,
    @Req() req: any,
  ) {
    return this.profileService.deleteaddress(addressId);
  }

  @Post('me/shop')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'banner', maxCount: 1 },
      ],
      {
        storage: getMulterOptions('shops').storage,
        fileFilter: getMulterOptions('shops').fileFilter,
      },
    ),
  )
  async createShop(
    @Body()
    body: {
      shop_name: string;
      slug: string;
      description: string;
      phone: string;
      email: string;
    },
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    if (!body?.shop_name || !body?.slug) {
      throw new BadRequestException('shop_name and slug are required');
    }

    let logoUrl = '';
    let bannerUrl = '';

    if (files?.logo?.[0]) {
      logoUrl =
        (files.logo[0] as any).location ||
        `/uploads/shops/${(files.logo[0] as any).filename}`;
    }

    if (files?.banner?.[0]) {
      bannerUrl =
        (files.banner[0] as any).location ||
        `/uploads/shops/${(files.banner[0] as any).filename}`;
    }

    return this.profileService.createshop_temp(
      userId,
      body.shop_name,
      body.slug,
      body.description || '',
      logoUrl,
      bannerUrl,
      body.phone || '',
      body.email || '',
    );
  }

  @Get('me/shop')
  @UseGuards(JwtAuthGuard)
  async getShop(@Req() req: any) {
    const userId = req.user.userId;
    return this.profileService.getshopbyuserid(userId);
  }

  @Patch('shops/:shopId/logo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PROFILE_SHOP)
  @UseInterceptors(FileInterceptor('file', getMulterOptions('shops')))
  async updateShopLogo(
    @Param('shopId', ParseIntPipe) shopId: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const userId = req.user.userId;
    const logoUrl = file.location || `/uploads/shops/${file.filename}`;
    return this.profileService.updatelogoshop(userId, shopId, logoUrl);
  }

  @Patch('shops/:shopId/banner')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PROFILE_SHOP)
  @UseInterceptors(FileInterceptor('file', getMulterOptions('shops')))
  async updateShopBanner(
    @Param('shopId', ParseIntPipe) shopId: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const userId = req.user.userId;
    const bannerUrl = file.location || `/uploads/shops/${file.filename}`;
    return this.profileService.updatebannershop(userId, shopId, bannerUrl);
  }

  @Patch('shops/:shopId/phone')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PROFILE_SHOP)
  async updateShopPhone(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body('phone') phone: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.profileService.updatephoneshop(userId, shopId, phone);
  }

  @Patch('shops/:shopId/email')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PROFILE_SHOP)
  async updateShopEmail(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body('email') email: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.profileService.updateemailshop(userId, shopId, email);
  }

  @Patch('shops/:shopId/description')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PROFILE_SHOP)
  async updateShopDescription(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body('description') description: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.profileService.updatedescriptionshop(
      userId,
      shopId,
      description,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.userId);
  }

  @Get(':userId/permissions')
  @UseGuards(JwtAuthGuard)
  async getUserPermissions(@Param('userId', ParseIntPipe) userId: number) {
    return this.profileService.getPermissionbyuserid(userId);
  }

  @Get(':id')
  getProfileById(@Param('id', ParseIntPipe) id: number) {
    return this.profileService.getProfile(id);
  }
}
