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

    async getProfile(userId: number) {
        return this.prisma.users.findUnique({
            where: { id: userId },
        });
    }
}
