import {
  Controller,
  Post,
  Delete,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('staff')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  async addStaff(
    @Body()
    body: {
      staffemail: string;
      shopid: number;
      is_manager?: boolean;
    },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.addstaff(
      userId,
      body.staffemail,
      body.shopid,
      body.is_manager ?? false,
    );
  }

  // Xóa nhân viên khỏi shop
  @Delete('staff')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  async removeStaff(
    @Body()
    body: {
      staffemail: string;
      shopid: number;
    },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.removestaff(userId, body.staffemail, body.shopid);
  }

  // Lấy danh sách nhân viên của shop
  @Get(':shopid/staffs')
  async getStaffs(@Param('shopid', ParseIntPipe) shopid: number) {
    return this.shopService.getstaffs(shopid);
  }

  @Post('staff/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  async updateStaffPermissions(
    @Body()
    body: {
      staffemail: string;
      shopid: number;
      permissions: string[];
    },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.updatestaffpermission(
      userId,
      body.staffemail,
      body.shopid,
      body.permissions,
    );
  }

  @Get(':shopid/staff/:staffemail/permissions')
  async getpermissionstaff(
    @Param('shopid', ParseIntPipe) shopid: number,
    @Param('staffemail') staffemail: string,
  ) {
    return this.shopService.getpermissionstaff(shopid, staffemail);
  }

  @Delete('staff/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  async deleteStaffPermissions(
    @Body()
    body: {
      staffemail: string;
      shopid: number;
      permissions: string[];
    },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.deletestaffpermission(
      userId,
      body.staffemail,
      body.shopid,
      body.permissions,
    );
  }
}
