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
        const createShopPermission = await this.prisma.permission.findUnique({
            where: { name: 'create_shop' },
            select: { id: true },
        });
        if (!createShopPermission) {
            return { message: 'Lỗi hệ thống: Không tìm thấy quyền create_shop' };
        }

        const hasCreateShopPermission = await this.prisma.userpermission.findFirst({
            where: { user_id: userid, permission_id: createShopPermission.id },
            select: { user_id: true },
        });
        if (!hasCreateShopPermission) {
            return { message: 'Bạn không có quyền tạo cửa hàng' };
        }

        const existingShop = await this.prisma.shops.findFirst({ where: { owner_id: userid } });
        if (existingShop) {
            return { message: 'Người dùng đã có cửa hàng' };
        }

        const sellerRole = await this.prisma.role.findUnique({
            where: { name: 'seller' },
            include: {
                rolePermissions: { select: { permission_id: true } },
            },
        });
        if (!sellerRole) {
            return { message: 'Lỗi hệ thống: Không tìm thấy role seller' };
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.shops.create({
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

            await tx.users.update({ where: { id: userid }, data: { role_id: sellerRole.id } });

            if (sellerRole.rolePermissions?.length) {
                await tx.userpermission.createMany({
                    data: sellerRole.rolePermissions.map((rp) => ({
                        user_id: userid,
                        permission_id: rp.permission_id,
                    })),
                    skipDuplicates: true,
                });
            }

            await tx.userpermission.deleteMany({
                where: { user_id: userid, permission_id: createShopPermission.id },
            });
        });

        return { message: 'Tạo cửa hàng thành công' };
    }

    async getshopbyuserid(userid: number) {
        const ownedShop = await this.prisma.shops.findFirst({
            where: { owner_id: userid },
        });

        if (ownedShop) {
            return ownedShop;
        }

        const staffShop = await this.prisma.shop_staffs.findFirst({
            where: { user_id: userid },
            include: {
                shop: true
            }
        });

        if (staffShop) {
            return staffShop.shop;
        }
        return null;
    }

    async getPermissionbyuserid(userid : number) {
        const perms = await this.prisma.userpermission.findMany({
            where: { user_id: userid },
            include: { permission: { select: { name: true } } },
        });

        if (!perms || perms.length === 0) {
            return [] as string[];
        }

        const names = perms
            .map((p) => p.permission?.name)
            .filter((n): n is string => typeof n === 'string' && n.length > 0);

        return names;
    }

    async updatelogoshop(userid:number ,shopid: number, logo_url: string) {
        const editprofileshopPermission = await this.prisma.permission.findUnique ({
            where : {name : 'edit_profile_shop'},
            select : {id : true}
        })
        if(!editprofileshopPermission){
            return { message : "Lỗi hệ thống , không tìm thấy quyền edit_profile_shop"};
        }

        const haseditprofileshopPermission = await this.prisma.userpermission.findFirst ({
            where : {user_id : userid, permission_id : editprofileshopPermission.id},
            select : { user_id : true}
        })

        if(!haseditprofileshopPermission) {
            return {message: "Bạn không có quyền chỉnh logo shop"}
        }

        await this.prisma.shops.update({
            where: { id: shopid },
            data: { logo_url: logo_url },
        });
        return { message: 'Cập nhật logo cửa hàng thành công' };
    }

    async updatebannershop(userid : number ,shopid: number, banner_url: string) {
        const editprofileshopPermission = await this.prisma.permission.findUnique ({
            where : {name : 'edit_profile_shop'},
            select : {id : true}
        })
        if(!editprofileshopPermission){
            return { message : "Lỗi hệ thống , không tìm thấy quyền edit_profile_shop"};
        }

        const haseditprofileshopPermission = await this.prisma.userpermission.findFirst ({
            where : {user_id : userid, permission_id : editprofileshopPermission.id},
            select : { user_id : true}
        })

        if(!haseditprofileshopPermission) {
            return {message: "Bạn không có quyền chỉnh banner shop"}
        }

        await this.prisma.shops.update({
            where: { id: shopid },
            data: { cover_url: banner_url },
        });
        return { message: 'Cập nhật banner cửa hàng thành công' };
    }

    async updatephoneshop(userid: number, shopid: number, phone: string) {
        const editprofileshopPermission = await this.prisma.permission.findUnique ({
            where : {name : 'edit_profile_shop'},
            select : {id : true}
        })
        if(!editprofileshopPermission){
            return { message : "Lỗi hệ thống , không tìm thấy quyền edit_profile_shop"};
        }

        const haseditprofileshopPermission = await this.prisma.userpermission.findFirst ({
            where : {user_id : userid, permission_id : editprofileshopPermission.id},
            select : { user_id : true}
        })

        if(!haseditprofileshopPermission) {
            return {message: "Bạn không có quyền chỉnh sdt shop"}
        }

        await this.prisma.shops.update({
            where: { id: shopid },
            data: { phone: phone },
        });
        return { message: 'Cập nhật số điện thoại cửa hàng thành công' };
    }

    async updateemailshop(userid:number , shopid: number, email: string) {
        const editprofileshopPermission = await this.prisma.permission.findUnique ({
            where : {name : 'edit_profile_shop'},
            select : {id : true}
        })
        if(!editprofileshopPermission){
            return { message : "Lỗi hệ thống , không tìm thấy quyền edit_profile_shop"};
        }

        const haseditprofileshopPermission = await this.prisma.userpermission.findFirst ({
            where : {user_id : userid, permission_id : editprofileshopPermission.id},
            select : { user_id : true}
        })

        if(!haseditprofileshopPermission) {
            return {message: "Bạn không có quyền chỉnh email shop"}
        }

        await this.prisma.shops.update({
            where: { id: shopid },
            data: { email: email },
        });
        return { message: 'Cập nhật email cửa hàng thành công' };
    }

    async updatedescriptionshop(userid:number ,shopid: number, description: string) {
        const editprofileshopPermission = await this.prisma.permission.findUnique ({
            where : {name : 'edit_profile_shop'},
            select : {id : true}
        })
        if(!editprofileshopPermission){
            return { message : "Lỗi hệ thống , không tìm thấy quyền edit_profile_shop"};
        }

        const haseditprofileshopPermission = await this.prisma.userpermission.findFirst ({
            where : {user_id : userid, permission_id : editprofileshopPermission.id},
            select : { user_id : true}
        })

        if(!haseditprofileshopPermission) {
            return {message: "Bạn không có quyền chỉnh mô tả shop"}
        }

        await this.prisma.shops.update({
            where: { id: shopid },
            data: { description: description },
        });
        return { message: 'Cập nhật mô tả cửa hàng thành công' };
    }

    
}
