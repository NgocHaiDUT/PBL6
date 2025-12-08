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
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateShopAddressDto } from './dto/create-shop-address.dto';
import { UpdateShopAddressDto } from './dto/update-shop-address.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetDistrictsDto, GetWardsDto } from '../delivery/dto/ghn.dto';
import { DeliveryService } from 'src/delivery/delivery.service';

@Controller('address')
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
    private readonly deliveryService: DeliveryService,
  ) {}

  // ==================== USER ADDRESS ENDPOINTS ====================

  @Post('user/add')
  @UseGuards(AuthGuard('jwt'))
  async addUserAddress(
    @Body() createAddressDto: CreateAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.addUserAddress(userId, createAddressDto);
  }

  @Put('user/update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateUserAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Body() updateAddressDto: UpdateAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.updateUserAddress(addressId, userId, updateAddressDto);
  }

  @Get('user/all')
  @UseGuards(AuthGuard('jwt'))
  async getAllUserAddresses(@Req() req: any) {
    const userId = req.user.userId;
    return this.addressService.getUserAddresses(userId);
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getUserAddressesByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.addressService.getUserAddresses(userId);
  }

  @Delete('user/delete/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteUserAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.deleteUserAddress(addressId, userId);
  }

  // ==================== SHOP ADDRESS ENDPOINTS ====================

  @Post('shop/add')
  @UseGuards(AuthGuard('jwt'))
  async addShopAddress(
    @Body() createShopAddressDto: CreateShopAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.addShopAddress(userId, createShopAddressDto);
  }

  @Put('shop/update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateShopAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Body() updateShopAddressDto: UpdateShopAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.updateShopAddress(addressId, userId, updateShopAddressDto);
  }

  @Get('shop/all/:shopId')
  @UseGuards(AuthGuard('jwt'))
  async getShopAddressesByShopId(
    @Param('shopId', ParseIntPipe) shopId: number,
  ) {
    return this.addressService.getShopAddresses(shopId);
  }

  @Delete('shop/delete/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteShopAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.deleteShopAddress(addressId, userId);
  }

  // ==================== LEGACY ENDPOINTS (Deprecated) ====================

  @Post('add-address')
  @UseGuards(AuthGuard('jwt'))
  async addAddress(
    @Body() createAddressDto: CreateAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.addUserAddress(userId, createAddressDto);
  }

  @Post('update-address')
  @UseGuards(AuthGuard('jwt'))
  async updateAddress(
    @Body() updateAddressDto: UpdateAddressDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.updateUserAddress(
      updateAddressDto.addressid,
      userId,
      updateAddressDto,
    );
  }

  @Get('all-address')
  @UseGuards(AuthGuard('jwt'))
  async getAllAddress(@Req() req: any) {
    const userId = req.user.userId;
    return this.addressService.getUserAddresses(userId);
  }

  @Post('delete-address')
  @UseGuards(AuthGuard('jwt'))
  async deleteAddress(
    @Body('addressid', ParseIntPipe) addressid: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.addressService.deleteUserAddress(addressid, userId);
  }

  // ==================== GHN ENDPOINTS ====================
  @Get('provinces')
  async getProvinces() {
    return this.deliveryService.getProvinces();
  }

  @Get('districts')
  async getDistricts(@Query() query: GetDistrictsDto) {
    if (!query.province_id) {
      throw new BadRequestException('province_id is required');
    }
    return this.deliveryService.getDistricts(query.province_id);
  }

  @Get('wards')
  async getWards(@Query() query: GetWardsDto) {
    if (!query.district_id) {
      throw new BadRequestException('district_id is required');
    }
    return this.deliveryService.getWards(query.district_id);
  }
}
