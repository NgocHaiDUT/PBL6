import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  BadRequestException,
  ParseIntPipe,
  UseGuards,
  Req,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateShopAddressDto } from './dto/create-shop-address.dto';
import { UpdateShopAddressDto } from './dto/update-shop-address.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetDistrictsDto, GetWardsDto } from '../delivery/dto/ghn.dto';
import { DeliveryService } from '../delivery/delivery.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';

@ApiTags('Address')
@Controller('address')
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
    private readonly deliveryService: DeliveryService,
  ) {}

  // ==================== USER ADDRESS ENDPOINTS ====================

  @Post('users/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Add new user address',
    description: 'Create a new delivery address for the current user. If is_default=true, all other addresses will automatically become non-default.'
  })
  @ApiResponse({ status: 201, description: 'Address added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or GHN validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addUserAddress(
    @Body() createAddressDto: CreateAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.addUserAddress(userId, createAddressDto);
  }

  @Put('users/me/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update user address',
    description: 'Update delivery address information. Users can only update their own addresses.'
  })
  @ApiParam({ name: 'id', description: 'Address ID to update', type: Number })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No permission to update this address' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async updateUserAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Body() updateAddressDto: UpdateAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.updateUserAddress(addressId, userId, updateAddressDto);
  }

  @Get('users/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get all addresses of current user',
    description: 'Retrieve all delivery addresses of the current user, sorted by default status and creation date.'
  })
  @ApiResponse({ status: 200, description: 'Addresses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllUserAddresses(@Req() req: any) {
    const userId = req.user.userId;
    return this.addressService.getUserAddresses(userId);
  }

  @Delete('users/me/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete user address',
    description: 'Delete a delivery address. Users can only delete their own addresses.'
  })
  @ApiParam({ name: 'id', description: 'Address ID to delete', type: Number })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No permission to delete this address' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async deleteUserAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.deleteUserAddress(addressId, userId);
  }

  // ==================== ADMIN - USER ADDRESS MANAGEMENT ====================

  @Post('users/:userId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Add address for a user',
    description: 'Admin creates a new delivery address for a specific user. Requires manage_users permission.'
  })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 201, description: 'Address added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or GHN validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_users permission' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async adminAddUserAddress(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.addressService.addUserAddress(userId, createAddressDto);
  }

  @Get('users/:userId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Get all addresses by user ID',
    description: 'Admin retrieves all delivery addresses of a specific user. Requires manage_users permission.'
  })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiResponse({ status: 200, description: 'Addresses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_users permission' })
  async adminGetUserAddresses(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.addressService.getUserAddresses(userId);
  }

  @Put('users/:userId/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Update user address',
    description: 'Admin updates any user delivery address. Requires manage_users permission.'
  })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiParam({ name: 'id', description: 'Address ID to update', type: Number })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_users permission' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async adminUpdateUserAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressService.adminUpdateUserAddress(addressId, updateAddressDto);
  }

  @Delete('users/:userId/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Delete user address',
    description: 'Admin deletes any user delivery address. Requires manage_users permission.'
  })
  @ApiParam({ name: 'userId', description: 'User ID', type: Number })
  @ApiParam({ name: 'id', description: 'Address ID to delete', type: Number })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_users permission' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async adminDeleteUserAddress(
    @Param('id', ParseIntPipe) addressId: number,
  ) {
    return this.addressService.adminDeleteUserAddress(addressId);
  }

  // ==================== SHOP ADDRESS ENDPOINTS ====================

  @Post('shops/:shopId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Add new shop address',
    description: 'Create a new warehouse/store address. Only shop owner or manager can add addresses.'
  })
  @ApiParam({ name: 'shopId', description: 'Shop ID', type: Number })
  @ApiResponse({ status: 201, description: 'Shop address added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No permission to add address for this shop' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async addShopAddress(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() createShopAddressDto: Omit<CreateShopAddressDto, 'shop_id'>,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.addShopAddress(userId, { ...createShopAddressDto, shop_id: shopId });
  }

  @Get('shops/:shopId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Get all shop addresses by shop ID',
    description: 'Retrieve all warehouse/store addresses of a specific shop, sorted by default status and creation date.'
  })
  @ApiParam({ name: 'shopId', description: 'Shop ID', type: Number })
  @ApiResponse({ status: 200, description: 'Shop addresses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getShopAddressesByShopId(
    @Param('shopId', ParseIntPipe) shopId: number,
  ) {
    return this.addressService.getShopAddresses(shopId);
  }

  @Put('shops/:shopId/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Update shop address',
    description: 'Update shop address information. Only shop owner or manager can update.'
  })
  @ApiParam({ name: 'shopId', description: 'Shop ID', type: Number })
  @ApiParam({ name: 'id', description: 'Shop address ID to update', type: Number })
  @ApiResponse({ status: 200, description: 'Shop address updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No permission to update this shop address' })
  @ApiResponse({ status: 404, description: 'Shop address not found' })
  async updateShopAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Body() updateShopAddressDto: UpdateShopAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.updateShopAddress(addressId, userId, updateShopAddressDto);
  }

  @Delete('shops/:shopId/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Delete shop address',
    description: 'Delete a shop address. Only shop owner or manager can delete.'
  })
  @ApiParam({ name: 'shopId', description: 'Shop ID', type: Number })
  @ApiParam({ name: 'id', description: 'Shop address ID to delete', type: Number })
  @ApiResponse({ status: 200, description: 'Shop address deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No permission to delete this shop address' })
  @ApiResponse({ status: 404, description: 'Shop address not found' })
  async deleteShopAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.deleteShopAddress(addressId, userId);
  }

  // ==================== ADMIN - SHOP ADDRESS MANAGEMENT ====================

  @Post('admin/shops/:shopId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Add address for a shop',
    description: 'Admin creates a new warehouse/store address for a specific shop. Requires manage_users permission.'
  })
  @ApiParam({ name: 'shopId', description: 'Shop ID', type: Number })
  @ApiResponse({ status: 201, description: 'Shop address added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_users permission' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async adminAddShopAddress(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Body() createShopAddressDto: Omit<CreateShopAddressDto, 'shop_id'>,
  ) {
    return this.addressService.adminAddShopAddress(shopId, createShopAddressDto);
  }

  @Get('admin/shops/:shopId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Get all shop addresses',
    description: 'Admin retrieves all addresses of a specific shop. Requires manage_users permission.'
  })
  @ApiParam({ name: 'shopId', description: 'Shop ID', type: Number })
  @ApiResponse({ status: 200, description: 'Shop addresses retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_users permission' })
  async adminGetShopAddresses(
    @Param('shopId', ParseIntPipe) shopId: number,
  ) {
    return this.addressService.getShopAddresses(shopId);
  }

  @Put('admin/shops/:shopId/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Update shop address',
    description: 'Admin updates any shop address. Requires manage_users permission.'
  })
  @ApiParam({ name: 'shopId', description: 'Shop ID', type: Number })
  @ApiParam({ name: 'id', description: 'Shop address ID to update', type: Number })
  @ApiResponse({ status: 200, description: 'Shop address updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_users permission' })
  @ApiResponse({ status: 404, description: 'Shop address not found' })
  async adminUpdateShopAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Body() updateShopAddressDto: UpdateShopAddressDto,
  ) {
    return this.addressService.adminUpdateShopAddress(addressId, updateShopAddressDto);
  }

  @Delete('admin/shops/:shopId/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_USERS)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '[Admin] Delete shop address',
    description: 'Admin deletes any shop address. Requires manage_users permission.'
  })
  @ApiParam({ name: 'shopId', description: 'Shop ID', type: Number })
  @ApiParam({ name: 'id', description: 'Shop address ID to delete', type: Number })
  @ApiResponse({ status: 200, description: 'Shop address deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_users permission' })
  @ApiResponse({ status: 404, description: 'Shop address not found' })
  async adminDeleteShopAddress(
    @Param('id', ParseIntPipe) addressId: number,
  ) {
    return this.addressService.adminDeleteShopAddress(addressId);
  }

  // ==================== GHN ENDPOINTS ====================
  @Get('provinces')
  @ApiOperation({ 
    summary: 'Get list of provinces/cities',
    description: 'Retrieve all provinces/cities from GHN (Giao Hang Nhanh) API.'
  })
  @ApiResponse({ status: 200, description: 'Provinces/cities retrieved successfully' })
  async getProvinces() {
    return this.deliveryService.getProvinces();
  }

  @Get('districts')
  @ApiOperation({ 
    summary: 'Get list of districts by province',
    description: 'Retrieve all districts belonging to a province/city from GHN API.'
  })
  @ApiQuery({ name: 'province_id', description: 'Province/city ID', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Districts retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Missing province_id' })
  async getDistricts(@Query() query: GetDistrictsDto) {
    if (!query.province_id) {
      throw new BadRequestException('province_id is required');
    }
    return this.deliveryService.getDistricts(query.province_id);
  }

  @Get('wards')
  @ApiOperation({ 
    summary: 'Get list of wards by district',
    description: 'Retrieve all wards belonging to a district from GHN API.'
  })
  @ApiQuery({ name: 'district_id', description: 'District ID', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Wards retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Missing district_id' })
  async getWards(@Query() query: GetWardsDto) {
    if (!query.district_id) {
      throw new BadRequestException('district_id is required');
    }
    return this.deliveryService.getWards(query.district_id);
  }
}
