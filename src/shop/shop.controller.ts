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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';
import { ShopService } from './shop.service';
import {
  AddStaffDto,
  RemoveStaffDto,
  UpdateStaffPermissionsDto,
} from './dto';

@ApiTags('Shop Management')
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}
  // Thêm nhân viên
  @Post(':shopId/staff')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add staff to shop',
    description:
      'Add a new staff member to the shop. Only shop owner or manager can perform this action. Staff will be assigned "staff" role and default permissions.',
  })
  @ApiBody({ type: AddStaffDto })
  @ApiResponse({
    status: 201,
    description: 'Staff added successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Staff added successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Not logged in',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - No MANAGE_SHOP_STAFF permission or not shop owner/manager',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff or shop not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Staff already exists in shop or is shop owner',
  })
  async addStaff(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body()
    body: AddStaffDto,
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

  // Remove staff from shop
  @Delete('staff')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove staff from shop',
    description:
      'Remove a staff member from the shop. If the staff is not working at any other shop, their role will be changed to "user" and permissions will be reset.',
  })
  @ApiBody({ type: RemoveStaffDto })
  @ApiResponse({
    status: 200,
    description: 'Staff removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Staff removed successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Not logged in',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - No MANAGE_SHOP_STAFF permission or attempting to remove shop owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff or shop not found',
  })
  async removeStaff(
    @Body()
    body: RemoveStaffDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.removestaff(userId, body.staffEmail, body.shopId);
  }

  // Get shop staff list
  @Get(':shopid/staffs')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get shop staff list',
    description:
      'Returns a list of all staff members working at the shop, including personal information of each staff member.',
  })
  @ApiParam({
    name: 'shopid',
    description: 'Shop ID to get staff list',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Staff list retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          shop_id: { type: 'number', example: 1 },
          user_id: { type: 'number', example: 5 },
          is_manager: { type: 'boolean', example: false },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 5 },
              email: { type: 'string', example: 'staff@example.com' },
              full_name: { type: 'string', example: 'Nguyen Van A' },
              avatar_url: { type: 'string', example: 'https://example.com/avatar.jpg' },
              phone: { type: 'string', example: '0912345678' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid shopid',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Not logged in',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No MANAGE_SHOP_STAFF permission',
  })
  async getStaffs(@Param('shopid', ParseIntPipe) shopid: number) {
    return this.shopService.getstaffs(shopid);
  }

  // Cập nhật quyền của nhân viên
  @Put(':shopId/staff/:staffEmail/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add permissions to staff',
    description:
      'Add new permissions to a staff member in the shop. Only owner or manager can perform this action. Duplicate permissions will be ignored.',
  })
  @ApiBody({ type: UpdateStaffPermissionsDto })
  @ApiResponse({
    status: 200,
    description: 'Staff permissions updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Staff permissions updated successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid or non-existent permissions',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Not logged in',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - No MANAGE_SHOP_STAFF permission or attempting to change shop owner permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found or does not belong to this shop',
  })
  async updateStaffPermissions(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('staffEmail') staffEmail: string,
    @Body()
    body: UpdateStaffPermissionsDto,
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

  @Get(':shopid/staff/:staffemail/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get staff permissions',
    description:
      'Returns a list of all permissions that the staff member currently has in the shop.',
  })
  @ApiParam({
    name: 'shopid',
    description: 'Shop ID',
    type: Number,
    example: 1,
  })
  @ApiParam({
    name: 'staffemail',
    description: 'Email of the staff member',
    type: String,
    example: 'staff@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions list retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['MANAGE_PRODUCTS', 'MANAGE_ORDERS', 'VIEW_STATISTICS'],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Not logged in',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No MANAGE_SHOP_STAFF permission',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found or does not belong to this shop',
  })
  async getpermissionstaff(
    @Param('shopid', ParseIntPipe) shopid: number,
    @Param('staffemail') staffemail: string,
  ) {
    return this.shopService.getpermissionstaff(shopid, staffemail);
  }

  // Xóa quyền của nhân viên
  @Delete(':shopId/staff/:staffEmail/permissions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove staff permissions',
    description:
      'Remove permissions from a staff member in the shop. Only owner or manager can perform this action. Cannot remove shop owner permissions.',
  })
  @ApiBody({ type: UpdateStaffPermissionsDto })
  @ApiResponse({
    status: 200,
    description: 'Staff permissions removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Removed 2 staff permissions' },
        deleted_count: { type: 'number', example: 2 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid permissions',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Not logged in',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - No MANAGE_SHOP_STAFF permission or attempting to remove shop owner permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found or does not belong to this shop',
  })
  async deleteStaffPermissions(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Param('staffEmail') staffEmail: string,
    @Body()
    body: UpdateStaffPermissionsDto,
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

  @Get(':shopid/details')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get shop details',
    description:
      'Get detailed information about a shop including owner info, staff count, and product count. Requires MANAGE_SHOP_ADMIN permission.',
  })
  @ApiParam({
    name: 'shopid',
    description: 'Shop ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Shop details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'My Beauty Shop' },
            slug: { type: 'string', example: 'my-beauty-shop' },
            description: { type: 'string', example: 'Best beauty products store' },
            logo_url: { type: 'string', example: 'https://example.com/logo.jpg' },
            cover_url: { type: 'string', example: 'https://example.com/cover.jpg' },
            phone: { type: 'string', example: '0912345678' },
            email: { type: 'string', example: 'shop@example.com' },
            is_verified: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            owner: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 1 },
                email: { type: 'string', example: 'owner@example.com' },
                full_name: { type: 'string', example: 'Shop Owner' },
                avatar_url: { type: 'string', example: 'https://example.com/avatar.jpg' },
                phone: { type: 'string', example: '0912345678' },
              },
            },
            staff_count: { type: 'number', example: 5 },
            product_count: { type: 'number', example: 120 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Not logged in',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - No MANAGE_SHOP_ADMIN permission',
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async getShopDetails(@Param('shopid', ParseIntPipe) shopid: number) {
    return this.shopService.getShopDetails(shopid);
  }
}
