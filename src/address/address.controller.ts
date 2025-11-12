import { Controller, Post, Body, Get, Query, BadRequestException, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetDistrictsDto, GetWardsDto } from '../ghn/dto/ghn.dto';

@Controller('address')
export class AddressController {
    constructor(private readonly addressService: AddressService) {}

    @Post('add-address')
    @UseGuards(AuthGuard('jwt'))
    async addAddress(@Body() createAddressDto: CreateAddressDto, @Req() req: any) {
        const userId = req.user.userId;
        return this.addressService.addaddress(userId, createAddressDto.label, createAddressDto.receiver_name, createAddressDto.phone, createAddressDto.province, createAddressDto.district, createAddressDto.ward, createAddressDto.street, createAddressDto.is_default, createAddressDto.ghn_province_id, createAddressDto.ghn_district_id, createAddressDto.ghn_ward_code);
    }

    @Post('update-address')
    @UseGuards(AuthGuard('jwt'))
    async updateAddress(@Body() updateAddressDto: UpdateAddressDto, @Req() req: any) {
        const userId = req.user.userId; // For ownership check in service if needed
        // We assume the service will handle checking if this address belongs to the user.
        return this.addressService.updateaddress(updateAddressDto.addressid, updateAddressDto.label, updateAddressDto.receiver_name, updateAddressDto.phone, updateAddressDto.province, updateAddressDto.district, updateAddressDto.ward, updateAddressDto.street, updateAddressDto.is_default, updateAddressDto.ghn_province_id, updateAddressDto.ghn_district_id, updateAddressDto.ghn_ward_code);
    }

    @Get('all-address')
    @UseGuards(AuthGuard('jwt'))
    async getAllAddress(@Req() req: any) {
        const userId = req.user.userId;
        return this.addressService.getaddresses(userId);
    }

    @Post('delete-address')
    @UseGuards(AuthGuard('jwt'))
    async deleteAddress(@Body('addressid', ParseIntPipe) addressid: number, @Req() req: any) {
        const userId = req.user.userId; // For ownership check in service if needed
        // We assume the service will handle checking if this address belongs to the user.
        return this.addressService.deleteaddress(addressid);
    }

    // GHN Endpoints
    @Get('provinces')
    async getProvinces() {
        return this.addressService.getProvinces();
    }

    @Get('districts')
    async getDistricts(@Query() query: GetDistrictsDto) {
        if (!query.province_id) {
            throw new BadRequestException('province_id is required');
        }
        return this.addressService.getDistricts(query.province_id);
    }

    @Get('wards')
    async getWards(@Query() query: GetWardsDto) {
        if (!query.district_id) {
            throw new BadRequestException('district_id is required');
        }
        return this.addressService.getWards(query.district_id);
    }
}