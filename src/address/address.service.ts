import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GhnService } from '../ghn/ghn.service';

@Injectable()
export class AddressService {
    constructor(
        private prisma: PrismaService,
        private readonly ghnService: GhnService,
    ) {}

    async addaddress(userid: number,label : string | undefined, receiver_name : string, phone : string, province: string, district: string, ward: string, street: string, is_default : boolean | undefined, ghn_province_id?: number, ghn_district_id?: number, ghn_ward_code?: string) {
        await this.prisma.addresses.create({
            data : {
                user_id : userid,
                label : label || '',
                recipient : receiver_name,
                phone : phone,
                province: province,
                district: district,
                ward: ward,
                street: street,
                is_default : is_default || false,
                ghn_province_id: ghn_province_id,
                ghn_district_id: ghn_district_id,
                ghn_ward_code: ghn_ward_code,
            }
        })
        return { message: 'Thêm địa chỉ nhận hàng thành công' };
    }

    async updateaddress(addressid: number,label : string | undefined, receiver_name : string | undefined, phone : string | undefined, province: string | undefined, district: string | undefined, ward: string | undefined, street: string | undefined, is_default : boolean | undefined, ghn_province_id?: number, ghn_district_id?: number, ghn_ward_code?: string) {
        const dataToUpdate: any = {};
        if (label !== undefined) dataToUpdate.label = label;
        if (receiver_name !== undefined) dataToUpdate.recipient = receiver_name;
        if (phone !== undefined) dataToUpdate.phone = phone;
        if (province !== undefined) dataToUpdate.province = province;
        if (district !== undefined) dataToUpdate.district = district;
        if (ward !== undefined) dataToUpdate.ward = ward;
        if (street !== undefined) dataToUpdate.street = street;
        if (is_default !== undefined) dataToUpdate.is_default = is_default;
        if (ghn_province_id !== undefined) dataToUpdate.ghn_province_id = ghn_province_id;
        if (ghn_district_id !== undefined) dataToUpdate.ghn_district_id = ghn_district_id;
        if (ghn_ward_code !== undefined) dataToUpdate.ghn_ward_code = ghn_ward_code;

        await this.prisma.addresses.update({
            where : { id : addressid },
            data : dataToUpdate
        });
        return { message: 'Cập nhật địa chỉ nhận hàng thành công' };
    }

    async deleteaddress(addressid: number) {
        await this.prisma.addresses.delete({
            where : { id : addressid },
        })
        return { message: 'Xoá địa chỉ thành công' };
    }

    async getaddresses(userid: number) {
        return this.prisma.addresses.findMany({
            where : { user_id : userid },
        })
    }

    // GHN Proxy Methods
    async getProvinces() {
        return this.ghnService.getProvinces();
    }

    async getDistricts(province_id: number) {
        return this.ghnService.getDistricts(province_id);
    }

    async getWards(district_id: number) {
        return this.ghnService.getWards(district_id);
    }
}