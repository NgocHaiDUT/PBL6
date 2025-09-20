import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ProfileService {
    constructor(private prisma: PrismaService) {}

    async updatefullname(userId: number, fullName: string): Promise<{ message: string }> {
        await this.prisma.users.update({
            where: { id: userId },
            data: { full_name: fullName },
        });
        return { message: 'Cập nhật tên thành công' };
    }

    async updateavatar(userId: number, avatarUrl: string): Promise<{ message: string }> {
        await this.prisma.users.update({
            where: { id: userId },
            data: { avatar_url: avatarUrl },
        });
        return { message: 'Cập nhật ảnh đại diện thành công' };
    }

    async updatephone(userId: number, phone: string): Promise<{ message: string }> {
        await this.prisma.users.update({
            where: { id: userId },
            data: { phone: phone },
        });
        return { message: 'Cập nhật số điện thoại thành công' };
    }

    async addaddress(userid: number,label : string, receiver_name : string, phone : string, line1 : string, line2 : string, city : string,state : string,postal_code : string,country: string, is_default : boolean) {
        await this.prisma.addresses.create({
            data : {
                user_id : userid,
                label : label,
                recipient : receiver_name,
                phone : phone,
                line1 : line1,
                line2 : line2,
                city : city,
                state : state,
                postal_code : postal_code,
                country : country,
                is_default : is_default
            }
        })
        return { message: 'Thêm địa chỉ nhận hàng thành công' };
    }

    async updateaddress(addressid: number,label : string, receiver_name : string, phone : string, line1 : string, line2 : string, city : string,state : string,postal_code : string,country: string, is_default : boolean) {
        await this.prisma.addresses.update({
            where : { id : addressid },
            data : {
                label : label,
                recipient : receiver_name,
                phone : phone,
                line1 : line1,
                line2 : line2,
                city : city,
                state : state,
                postal_code : postal_code,
                country : country,
                is_default : is_default
            }
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
