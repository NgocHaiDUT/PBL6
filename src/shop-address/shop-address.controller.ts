import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Delete,
  Patch,
  ParseIntPipe,
} from '@nestjs/common';
import { ShopAddressService } from './shop-address.service';
import { CreateShopAddressDto } from './dto/create-shop-address.dto';
import { UpdateShopAddressDto } from './dto/update-shop-address.dto';

@Controller('shop-address')
export class ShopAddressController {
  constructor(private readonly shopAddressService: ShopAddressService) {}

  @Post()
  async addShopAddress(@Body() createShopAddressDto: CreateShopAddressDto) {
    return this.shopAddressService.addShopAddress(createShopAddressDto);
  }

  @Patch(':id')
  async updateShopAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Body() updateShopAddressDto: UpdateShopAddressDto,
  ) {
    return this.shopAddressService.updateShopAddress(
      addressId,
      updateShopAddressDto,
    );
  }

  @Get()
  async getShopAddresses(@Query('shop_id', ParseIntPipe) shopId: number) {
    return this.shopAddressService.getShopAddresses(shopId);
  }

  @Delete(':id')
  async deleteShopAddress(@Param('id', ParseIntPipe) addressId: number) {
    return this.shopAddressService.deleteShopAddress(addressId);
  }
}
