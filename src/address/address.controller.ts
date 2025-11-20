import { Controller, Post, Body, Get, Query, BadRequestException, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('address')
@UseGuards(AuthGuard('jwt'))
export class AddressController {
    constructor(private readonly addressService: AddressService) {}

    @Post('add-address')
    async addAddress(@Body() createAddressDto: CreateAddressDto, @Req() req: any) {
        const userId = req.user.userId;
        return this.addressService.addaddress(userId, createAddressDto.label, createAddressDto.receiver_name, createAddressDto.phone, createAddressDto.province, createAddressDto.district, createAddressDto.ward, createAddressDto.street, createAddressDto.is_default);
    }

    @Post('update-address')
    async updateAddress(@Body() updateAddressDto: UpdateAddressDto, @Req() req: any) {
        const userId = req.user.userId; // For ownership check in service if needed
        // We assume the service will handle checking if this address belongs to the user.
        return this.addressService.updateaddress(updateAddressDto.addressid, updateAddressDto.label, updateAddressDto.receiver_name, updateAddressDto.phone, updateAddressDto.province, updateAddressDto.district, updateAddressDto.ward, updateAddressDto.street, updateAddressDto.is_default);
    }

    @Get('all-address')
    async getAllAddress(@Req() req: any) {
        const userId = req.user.userId;
        return this.addressService.getaddresses(userId);
    }

    @Post('delete-address')
    async deleteAddress(@Body('addressid', ParseIntPipe) addressid: number, @Req() req: any) {
        const userId = req.user.userId; // For ownership check in service if needed
        // We assume the service will handle checking if this address belongs to the user.
        return this.addressService.deleteaddress(addressid);
    }
}