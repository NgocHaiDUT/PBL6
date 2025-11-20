import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopAddressDto } from './dto/create-shop-address.dto';
import { UpdateShopAddressDto } from './dto/update-shop-address.dto';

@Injectable()
export class ShopAddressService {
    constructor(private prisma: PrismaService) {}

    async addShopAddress(createShopAddressDto: CreateShopAddressDto) {
        return this.prisma.shop_addresses.create({
            data: createShopAddressDto,
        });
    }

    async updateShopAddress(addressId: number, updateShopAddressDto: UpdateShopAddressDto) {
        return this.prisma.shop_addresses.update({
            where: { id: addressId },
            data: updateShopAddressDto,
        });
    }

    async getShopAddresses(shopId: number) {
        return this.prisma.shop_addresses.findMany({
            where: { shop_id: shopId },
        });
    }

    async deleteShopAddress(addressId: number) {
        return this.prisma.shop_addresses.delete({
            where: { id: addressId },
        });
    }
}