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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiQuery,
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
  UpdateShopDto,
} from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  shopLogoConfig,
  shopCoverConfig,
  getShopLogoUrl,
  getShopCoverUrl,
} from './config/s3-shop.config';

@ApiTags('Shop Management')
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}
  // Thêm nhân viên
  @Post(':shopId/staff')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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

  @Get(':shopid/staff/:staffemail/permissions/all')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_STAFF)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all permissions with staff status',
    description:
      'Returns a list of ALL available permissions with a flag indicating if the staff member has each permission. Useful for UI checkboxes.',
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
    description: 'All permissions with status retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'manage_product' },
          isGranted: { type: 'boolean', example: true },
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
    description: 'Forbidden - No MANAGE_SHOP_STAFF permission',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff not found or does not belong to this shop',
  })
  async getAllPermissionsWithStatus(
    @Param('shopid', ParseIntPipe) shopid: number,
    @Param('staffemail') staffemail: string,
  ) {
    return this.shopService.getallpermissionswithstatus(shopid, staffemail);
  }

  // Xóa quyền của nhân viên
  @Delete(':shopId/staff/:staffEmail/permissions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get shop details',
    description:
      'Get detailed information about a shop including owner info, full staff list with details, and total product count. Requires MANAGE_SHOP_ADMIN permission.',
  })
  @ApiParam({
    name: 'shopid',
    description: 'Shop ID',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Shop details retrieved successfully with full staff list and product count',
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
            staffs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  user_id: { type: 'number', example: 5 },
                  is_manager: { type: 'boolean', example: false },
                  created_at: { type: 'string', format: 'date-time' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'number', example: 5 },
                      email: { type: 'string', example: 'staff@example.com' },
                      full_name: { type: 'string', example: 'Staff Name' },
                      avatar_url: { type: 'string', example: 'https://example.com/avatar.jpg' },
                      phone: { type: 'string', example: '0987654321' },
                      role: { type: 'string', example: 'staff' },
                    },
                  },
                },
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

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all shops with pagination',
    description:
      'Get a paginated list of all shops in the system with filters. Requires authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Shops list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Beauty Store' },
              slug: { type: 'string', example: 'beauty-store' },
              description: { type: 'string', example: 'Best beauty products' },
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
                },
              },
              staff_count: { type: 'number', example: 5 },
              product_count: { type: 'number', example: 120 },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 50 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Not logged in',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by shop name or description' })
  @ApiQuery({ name: 'isVerified', required: false, type: String, example: 'true', description: 'Filter by verification status' })
  async getShops(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isVerified') isVerified?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    const isVerifiedBool = isVerified === 'true' ? true : isVerified === 'false' ? false : undefined;
    return this.shopService.getShops(pageNum, limitNum, search, isVerifiedBool);
  }

  @Put(':shopid')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
      ],
      shopCoverConfig, // Use cover config as it has larger limit
    ),
  )
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update shop information',
    description:
      'Update shop details including name, description, logo (upload to S3/Local), cover image (upload to S3/Local), phone, and email. Only shop owner or manager can perform this action (checked by business logic). Logo and cover are optional file uploads.',
  })
  @ApiParam({
    name: 'shopid',
    description: 'Shop ID to update',
    type: Number,
    example: 1,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Shop Name', description: 'Shop name' },
        description: { type: 'string', example: 'Updated description', description: 'Shop description' },
        phone: { type: 'string', example: '0987654321', description: 'Contact phone' },
        email: { type: 'string', example: 'contact@shop.com', description: 'Contact email' },
        logo: { type: 'string', format: 'binary', description: 'Shop logo image file (JPG, PNG, GIF, WebP - max 10MB)' },
        cover: { type: 'string', format: 'binary', description: 'Shop cover image file (JPG, PNG, GIF, WebP - max 10MB)' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Shop updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cập nhật thông tin cửa hàng thành công' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Updated Shop Name' },
            slug: { type: 'string', example: 'updated-shop-name' },
            description: { type: 'string', example: 'Updated description' },
            logo_url: { type: 'string', example: 'https://example.com/new-logo.jpg' },
            cover_url: { type: 'string', example: 'https://example.com/new-cover.jpg' },
            phone: { type: 'string', example: '0987654321' },
            email: { type: 'string', example: 'newcontact@shop.com' },
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
              },
            },
          },
        },
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
    description: 'Forbidden - Not shop owner/manager',
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async updateShop(
    @Param('shopid', ParseIntPipe) shopid: number,
    @Body() body: UpdateShopDto,
    @UploadedFiles() files: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    
    // Generate URLs for uploaded files (S3 or local)
    const updateData = { ...body };
    
    if (files?.logo && files.logo[0]) {
      const logoFile = files.logo[0] as any;
      // For S3: use location property, for local: use getShopLogoUrl
      updateData.logo_url = logoFile.location || getShopLogoUrl(files.logo[0]);
    }
    
    if (files?.cover && files.cover[0]) {
      const coverFile = files.cover[0] as any;
      // For S3: use location property, for local: use getShopCoverUrl
      updateData.cover_url = coverFile.location || getShopCoverUrl(files.cover[0]);
    }
    
    return this.shopService.updateShop(userId, shopid, updateData);
  }

  @Put(':shopid/ban')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_SHOP_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Ban a shop',
    description:
      'Ban a shop by setting is_verified to false. Only admin can perform this action. This will make the shop inactive.',
  })
  @ApiParam({
    name: 'shopid',
    description: 'Shop ID to ban',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Shop banned successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Shop "Beauty Store" đã bị ban (is_verified = false)' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Not logged in',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admin can ban shops',
  })
  @ApiResponse({
    status: 404,
    description: 'Shop not found',
  })
  async banShop(
    @Param('shopid', ParseIntPipe) shopid: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.shopService.banShop(userId, shopid);
  }
}
