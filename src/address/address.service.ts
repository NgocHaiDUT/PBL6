import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryService } from '../delivery/delivery.service';

@Injectable()
export class AddressService {
  constructor(
    private prisma: PrismaService,
    private deliveryService: DeliveryService,
  ) {}

  async addaddress(
    userid: number,
    label: string | undefined,
    receiver_name: string,
    phone: string,
    province: string,
    district: string,
    ward: string,
    street: string,
    is_default: boolean | undefined,
    ghn_province_id?: number,
    ghn_district_id?: number,
    ghn_ward_code?: string,
  ) {
    let officialProvinceName = province;
    let officialDistrictName = district;
    let officialWardName = ward;

    if (ghn_province_id && ghn_district_id && ghn_ward_code) {
      try {
        const provinces = await this.deliveryService.getProvinces();
        const foundProvince = provinces.find(
          (p) => p.ProvinceID === ghn_province_id,
        );
        if (foundProvince) officialProvinceName = foundProvince.ProvinceName;

        const districts =
          await this.deliveryService.getDistricts(ghn_province_id);
        const foundDistrict = districts.find(
          (d) => d.DistrictID === ghn_district_id,
        );
        if (foundDistrict) officialDistrictName = foundDistrict.DistrictName;

        const wards = await this.deliveryService.getWards(ghn_district_id);
        const foundWard = wards.find((w) => w.WardCode === ghn_ward_code);
        if (foundWard) officialWardName = foundWard.WardName;
      } catch (error) {
        throw new BadRequestException(
          'Failed to validate address with GHN. Please check the provided location IDs.',
        );
      }
    }

    await this.prisma.addresses.create({
      data: {
        user_id: userid,
        label: label || '',
        recipient: receiver_name,
        phone: phone,
        province: officialProvinceName,
        district: officialDistrictName,
        ward: officialWardName,
        street: street,
        is_default: is_default || false,
        ghn_province_id: ghn_province_id,
        ghn_district_id: ghn_district_id,
        ghn_ward_code: ghn_ward_code,
      },
    });
    return { message: 'Thêm địa chỉ nhận hàng thành công' };
  }

  async updateaddress(
    addressid: number,
    label: string | undefined,
    receiver_name: string | undefined,
    phone: string | undefined,
    province: string | undefined,
    district: string | undefined,
    ward: string | undefined,
    street: string | undefined,
    is_default: boolean | undefined,
    ghn_province_id?: number,
    ghn_district_id?: number,
    ghn_ward_code?: string,
  ) {
    const dataToUpdate: any = {};
    if (label !== undefined) dataToUpdate.label = label;
    if (receiver_name !== undefined) dataToUpdate.recipient = receiver_name;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (street !== undefined) dataToUpdate.street = street;
    if (is_default !== undefined) dataToUpdate.is_default = is_default;

    dataToUpdate.province = province;
    dataToUpdate.district = district;
    dataToUpdate.ward = ward;
    dataToUpdate.ghn_province_id = ghn_province_id;
    dataToUpdate.ghn_district_id = ghn_district_id;
    dataToUpdate.ghn_ward_code = ghn_ward_code;

    if (ghn_province_id && ghn_district_id && ghn_ward_code) {
      try {
        const provinces = await this.deliveryService.getProvinces();
        const foundProvince = provinces.find(
          (p) => p.ProvinceID === ghn_province_id,
        );
        if (foundProvince) dataToUpdate.province = foundProvince.ProvinceName;

        const districts =
          await this.deliveryService.getDistricts(ghn_province_id);
        const foundDistrict = districts.find(
          (d) => d.DistrictID === ghn_district_id,
        );
        if (foundDistrict) dataToUpdate.district = foundDistrict.DistrictName;

        const wards = await this.deliveryService.getWards(ghn_district_id);
        const foundWard = wards.find((w) => w.WardCode === ghn_ward_code);
        if (foundWard) dataToUpdate.ward = foundWard.WardName;
      } catch (error) {
        throw new BadRequestException(
          'Failed to validate address with GHN. Please check the provided location IDs.',
        );
      }
    }

    await this.prisma.addresses.update({
      where: { id: addressid },
      data: dataToUpdate,
    });
    return { message: 'Cập nhật địa chỉ nhận hàng thành công' };
  }

  async deleteaddress(addressid: number) {
    await this.prisma.addresses.delete({
      where: { id: addressid },
    });
    return { message: 'Xoá địa chỉ thành công' };
  }

  async getaddresses(userid: number) {
    return this.prisma.addresses.findMany({
      where: { user_id: userid },
    });
  }
}
