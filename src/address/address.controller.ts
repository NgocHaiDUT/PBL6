import { Controller, Post, Body, Get, Query, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('address')
export class AddressController {
    constructor(private readonly addressService: AddressService) {}

    @Post('add-address')
    async addAddress(@Body() createAddressDto: CreateAddressDto) {
        return this.addressService.addaddress(createAddressDto.userid, createAddressDto.label, createAddressDto.receiver_name, createAddressDto.phone, createAddressDto.province, createAddressDto.district, createAddressDto.ward, createAddressDto.street, createAddressDto.is_default);
    }

    @Post('update-address')
    async updateAddress(@Body() updateAddressDto: UpdateAddressDto) {
        return this.addressService.updateaddress(updateAddressDto.addressid, updateAddressDto.label, updateAddressDto.receiver_name, updateAddressDto.phone, updateAddressDto.province, updateAddressDto.district, updateAddressDto.ward, updateAddressDto.street, updateAddressDto.is_default);
    }

    @Get('all-address')
    async getAllAddress(@Query('userid', ParseIntPipe) userid: number) {
        return this.addressService.getaddresses(userid);
    }

    @Post('delete-address')
    async deleteAddress(@Body('addressid', ParseIntPipe) addressid: number) {
        return this.addressService.deleteaddress(addressid);
    }
}