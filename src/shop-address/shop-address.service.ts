import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopAddressDto } from './dto/create-shop-address.dto';
import { UpdateShopAddressDto } from './dto/update-shop-address.dto';
import { GhnService } from '../ghn/ghn.service'; // Import GhnService

@Injectable()
export class ShopAddressService {
    constructor(
        private prisma: PrismaService,
        private ghnService: GhnService, // Inject GhnService
    ) {}

    async addShopAddress(createShopAddressDto: CreateShopAddressDto) {
        const newShopAddress = await this.prisma.shop_addresses.create({
            data: {
                shop_id: createShopAddressDto.shop_id,
                name: createShopAddressDto.name,
                phone: createShopAddressDto.phone,
                email: createShopAddressDto.email,
                province: createShopAddressDto.province,
                district: createShopAddressDto.district,
                ward: createShopAddressDto.ward,
                street: createShopAddressDto.street,
                is_default: createShopAddressDto.is_default,
                ghn_province_id: createShopAddressDto.ghn_province_id,
                ghn_district_id: createShopAddressDto.ghn_district_id,
                ghn_ward_code: createShopAddressDto.ghn_ward_code,
            },
        });

        if (newShopAddress.is_default && newShopAddress.ghn_district_id && newShopAddress.ghn_ward_code) {
            try {
                const registeredShop = await this.ghnService.registerShop({
                    district_id: newShopAddress.ghn_district_id,
                    ward_code: newShopAddress.ghn_ward_code,
                    name: newShopAddress.name,
                    phone: newShopAddress.phone,
                    address: `${newShopAddress.street}, ${newShopAddress.ward}, ${newShopAddress.district}, ${newShopAddress.province}`,
                });

                if (registeredShop && registeredShop.shop_id) {
                    await this.prisma.shops.update({
                        where: { id: newShopAddress.shop_id },
                        data: { ghn_shop_id: registeredShop.shop_id },
                    });
                }
            } catch (error) {
                console.error('Error registering shop with GHN:', error);
                // Optionally, handle this error more gracefully, e.g., log it, notify admin, etc.
            }
        }
        return newShopAddress;
    }

    async updateShopAddress(addressId: number, updateShopAddressDto: UpdateShopAddressDto) {
        const dataToUpdate: any = { ...updateShopAddressDto };

        // If ghn_province_id is explicitly set to null or undefined, ensure it's handled
        if (updateShopAddressDto.ghn_province_id === null) dataToUpdate.ghn_province_id = null;
        if (updateShopAddressDto.ghn_district_id === null) dataToUpdate.ghn_district_id = null;
        if (updateShopAddressDto.ghn_ward_code === null) dataToUpdate.ghn_ward_code = null;

        return this.prisma.shop_addresses.update({
            where: { id: addressId },
            data: dataToUpdate,
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