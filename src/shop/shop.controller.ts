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

@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}
  // Thêm nhân viên
  @Post(':shopId/staff')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  async addStaff(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body()
    body: {
      staffEmail: string;
      isManager?: boolean;
    },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.addstaff(
      userId,
      body.staffEmail,
      shopId,
      body.isManager ?? false,
    );
  }

  // Xóa nhân viên khỏi shop
  @Delete(':shopId/staff/:staffEmail')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  async removeStaff(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('staffEmail') staffEmail: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.removestaff(userId, staffEmail, shopId);
  }

  // Lấy danh sách nhân viên của shop
  @Get(':shopId/staff')
  async getStaffs(@Param('shopId', ParseIntPipe) shopId: number) {
    return this.shopService.getstaffs(shopId);
  }

  // Cập nhật quyền của nhân viên
  @Put(':shopId/staff/:staffEmail/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  async updateStaffPermissions(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('staffEmail') staffEmail: string,
    @Body() body: { permissions: string[] },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.updatestaffpermission(
      userId,
      staffEmail,
      shopId,
      body.permissions,
    );
  }

  // Lấy quyền của nhân viên
  @Get(':shopId/staff/:staffEmail/permissions')
  async getStaffPermissions(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('staffEmail') staffEmail: string,
  ) {
    return this.shopService.getpermissionstaff(shopId, staffEmail);
  }

  // Xóa quyền của nhân viên
  @Delete(':shopId/staff/:staffEmail/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  async deleteStaffPermissions(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('staffEmail') staffEmail: string,
    @Body() body: { permissions: string[] },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.deletestaffpermission(
      userId,
      staffEmail,
      shopId,
      body.permissions,
    );
  }
}
