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

    async updatestory(userId: number, story: string): Promise<{ message: string }> {
        await this.prisma.users.update({
            where: { id: userId },
            data: { story: story },
        });
        return { message: 'Cập nhật giới thiệu thành công' };
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

    async createshop(userid: number, shop_name: string, slug: string, description: string, avatar_url: string, banner_url: string, phone: string, email: string) {
        const existingShop = await this.prisma.shops.findFirst({
            where: { owner_id: userid },
        });
        if (existingShop) {
            return { message: 'Người dùng đã có cửa hàng' };
        }
        await this.prisma.shops.create({
            data: {
                owner_id: userid,
                name: shop_name,
                slug: slug,
                description: description,
                logo_url: avatar_url,
                phone: phone,
                email: email,
                cover_url: banner_url,
                is_verified: false,
            },
        });
        return { message: 'Tạo cửa hàng thành công' };
    }

    async getshopbyuserid(userid: number) {
        return this.prisma.shops.findFirst({
            where: { owner_id: userid },
        });
    }

    async updatelogoshop(shopid: number, logo_url: string) {
        await this.prisma.shops.update({
            where: { id: shopid },
            data: { logo_url: logo_url },
        });
        return { message: 'Cập nhật logo cửa hàng thành công' };
    }

    async updatebannershop(shopid: number, banner_url: string) {
        await this.prisma.shops.update({
            where: { id: shopid },
            data: { cover_url: banner_url },
        });
        return { message: 'Cập nhật banner cửa hàng thành công' };
    }

    async updatephoneshop(shopid: number, phone: string) {
        await this.prisma.shops.update({
            where: { id: shopid },
            data: { phone: phone },
        });
        return { message: 'Cập nhật số điện thoại cửa hàng thành công' };
    }

    async updateemailshop(shopid: number, email: string) {
        await this.prisma.shops.update({
            where: { id: shopid },
            data: { email: email },
        });
        return { message: 'Cập nhật email cửa hàng thành công' };
    }

    async updatedescriptionshop(shopid: number, description: string) {
        await this.prisma.shops.update({
            where: { id: shopid },
            data: { description: description },
        });
        return { message: 'Cập nhật mô tả cửa hàng thành công' };
    }

    async getUserInfo(userId: number) {
        try {
            const user = await this.prisma.users.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    full_name: true,
                    email: true,
                    avatar_url: true,
                    phone: true,
                    story: true,
                    created_at: true,
                    role: true
                }
            });

            if (!user) {
                return { success: false, message: 'User not found' };
            }

            return {
                success: true,
                data: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    Avatar: user.avatar_url, // Map to match UserInfo interface
                    phone: user.phone,
                    story: user.story,
                    created_at: user.created_at,
                    role: user.role
                }
            };
        } catch (error) {
            console.error('Error getting user info:', error);
            return { success: false, message: 'Internal server error' };
        }
    }

}
