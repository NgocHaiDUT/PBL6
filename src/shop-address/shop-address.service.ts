import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopAddressDto } from './dto/create-shop-address.dto';
import { UpdateShopAddressDto } from './dto/update-shop-address.dto';
import { DeliveryService } from '../delivery/delivery.service';

@Injectable()
export class ShopAddressService {
  constructor(
    private prisma: PrismaService,
    private deliveryService: DeliveryService,
  ) {}

  async addShopAddress(createShopAddressDto: CreateShopAddressDto) {
    let {
      province,
      district,
      ward,
      ghn_province_id,
      ghn_district_id,
      ghn_ward_code,
      ...restDto
    } = createShopAddressDto;

    if (ghn_province_id && ghn_district_id && ghn_ward_code) {
      try {
        const provinces = await this.deliveryService.getProvinces();
        const foundProvince = provinces.find(
          (p) => p.ProvinceID === ghn_province_id,
        );
        if (foundProvince) province = foundProvince.ProvinceName;

        const districts =
          await this.deliveryService.getDistricts(ghn_province_id);
        const foundDistrict = districts.find(
          (d) => d.DistrictID === ghn_district_id,
        );
        if (foundDistrict) district = foundDistrict.DistrictName;

        const wards = await this.deliveryService.getWards(ghn_district_id);
        const foundWard = wards.find((w) => w.WardCode === ghn_ward_code);
        if (foundWard) ward = foundWard.WardName;
      } catch (error) {
        throw new BadRequestException(
          'Failed to validate shop address with GHN. Please check the provided location IDs.',
        );
      }
    }

    const newShopAddress = await this.prisma.shop_addresses.create({
      data: {
        ...restDto,
        province,
        district,
        ward,
        ghn_province_id,
        ghn_district_id,
        ghn_ward_code,
      },
    });

    if (
      newShopAddress.is_default &&
      newShopAddress.ghn_district_id &&
      newShopAddress.ghn_ward_code
    ) {
      try {
        const registeredShop = await this.deliveryService.registerShop({
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
      }
    }
    return newShopAddress;
  }

  async updateShopAddress(
    addressId: number,
    updateShopAddressDto: UpdateShopAddressDto,
  ) {
    const dataToUpdate: any = { ...updateShopAddressDto };

    if (
      dataToUpdate.ghn_province_id &&
      dataToUpdate.ghn_district_id &&
      dataToUpdate.ghn_ward_code
    ) {
      try {
        const provinces = await this.deliveryService.getProvinces();
        const foundProvince = provinces.find(
          (p) => p.ProvinceID === dataToUpdate.ghn_province_id,
        );
        if (foundProvince) dataToUpdate.province = foundProvince.ProvinceName;

        const districts = await this.deliveryService.getDistricts(
          dataToUpdate.ghn_province_id,
        );
        const foundDistrict = districts.find(
          (d) => d.DistrictID === dataToUpdate.ghn_district_id,
        );
        if (foundDistrict) dataToUpdate.district = foundDistrict.DistrictName;

        const wards = await this.deliveryService.getWards(
          dataToUpdate.ghn_district_id,
        );
        const foundWard = wards.find(
          (w) => w.WardCode === dataToUpdate.ghn_ward_code,
        );
        if (foundWard) dataToUpdate.ward = foundWard.WardName;
      } catch (error) {
        throw new BadRequestException(
          'Failed to validate shop address with GHN. Please check the provided location IDs.',
        );
      }
    }

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
