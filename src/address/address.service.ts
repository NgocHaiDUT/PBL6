import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AddressService {
    constructor(private prisma: PrismaService) {}

    async addaddress(userid: number,label : string | undefined, receiver_name : string, phone : string, province: string, district: string, ward: string, street: string, is_default : boolean | undefined) {
        const existuser = await this.prisma.users.findUnique({
            where : {id : userid},
            select : {id : true}
        })
        if(!existuser) {
            return { message : "User không tồn tại"}
        }
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
                is_default : is_default || false
            }
        })
        return { message: 'Thêm địa chỉ nhận hàng thành công' };
    }

    async updateaddress(addressid: number,label : string | undefined, receiver_name : string | undefined, phone : string | undefined, province: string | undefined, district: string | undefined, ward: string | undefined, street: string | undefined, is_default : boolean | undefined) {
        const dataToUpdate: any = {};
        if (label !== undefined) dataToUpdate.label = label;
        if (receiver_name !== undefined) dataToUpdate.recipient = receiver_name;
        if (phone !== undefined) dataToUpdate.phone = phone;
        if (province !== undefined) dataToUpdate.province = province;
        if (district !== undefined) dataToUpdate.district = district;
        if (ward !== undefined) dataToUpdate.ward = ward;
        if (street !== undefined) dataToUpdate.street = street;
        if (is_default !== undefined) dataToUpdate.is_default = is_default;

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
}