import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  async addstaff(
    userid: number,
    emailstaff: string,
    shopid: number,
    is_manager: boolean = false,
  ) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const staff = await this.prisma.users.findUnique({
      where: { email: emailstaff },
      select: { id: true, email: true },
    });

    if (!staff) {
      return { success: false, message: 'Nhân viên không tồn tại' };
    }

    const shop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      select: { owner_id: true },
    });

    if (!shop) {
      return { success: false, message: 'Cửa hàng không tồn tại' };
    }

    const isOwner = shop.owner_id === userid;
    const isManager = await this.prisma.shop_staffs.findFirst({
      where: { shop_id: shopid, user_id: userid, is_manager: true },
      select: { id: true },
    });

    if (!isOwner && !isManager) {
      return {
        success: false,
        message: 'Bạn không có quyền quản lý cửa hàng này',
      };
    }

    const existingStaff = await this.prisma.shop_staffs.findFirst({
      where: { shop_id: shopid, user_id: staff.id },
    });

    if (existingStaff) {
      return {
        success: false,
        message: 'Người này đã là nhân viên của cửa hàng',
      };
    }

    const isshopowner = await this.prisma.shops.findUnique({
      where: { owner_id: staff.id },
      select: { owner_id: true },
    });

    if (!isshopowner) {
      return {
        success: false,
        message: 'Không thể thêm chủ shop làm nhân viên',
      };
    }

    const staffRole = await this.prisma.role.findUnique({
      where: { name: 'staff' },
      include: {
        rolePermissions: {
          select: { permission_id: true },
        },
      },
    });

    if (!staffRole) {
      return {
        success: false,
        message: 'Lỗi hệ thống: Không tìm thấy role staff',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.shop_staffs.create({
        data: {
          shop_id: shopid,
          user_id: staff.id,
          is_manager: is_manager,
        },
      });

      await tx.users.update({
        where: { id: staff.id },
        data: { role_id: staffRole.id },
      });

      if (staffRole.rolePermissions && staffRole.rolePermissions.length > 0) {
        const data = staffRole.rolePermissions.map((rp) => ({
          user_id: staff.id,
          permission_id: rp.permission_id,
        }));
        await tx.userpermission.createMany({ data, skipDuplicates: true });
      }
    });

    return { success: true, message: 'Thêm nhân viên thành công' };
  }

  async removestaff(userid: number, staffemail: string, shopid: number) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const shop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      select: { owner_id: true },
    });

    if (!shop) {
      return { success: false, message: 'Cửa hàng không tồn tại' };
    }

    const staff = await this.prisma.users.findUnique({
      where: { email: staffemail },
      select: { id: true, email: true },
    });

    if (!staff) {
      return { success: false, message: 'Nhân viên không tồn tại' };
    }

    if (staff.id === shop.owner_id) {
      return { success: false, message: 'Không thể xóa chủ cửa hàng' };
    }

    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.shop_staffs.deleteMany({
        where: { shop_id: shopid, user_id: staff.id },
      });

      if (deleted.count === 0) {
        throw new Error('Nhân viên không tồn tại trong cửa hàng');
      }

      const otherShops = await tx.shop_staffs.findFirst({
        where: { user_id: staff.id },
      });

      if (!otherShops) {
        const userRole = await tx.role.findUnique({
          where: { name: 'user' },
          include: {
            rolePermissions: {
              select: { permission_id: true },
            },
          },
        });

        if (userRole) {
          await tx.users.update({
            where: { id: staff.id },
            data: { role_id: userRole.id },
          });

          await tx.userpermission.deleteMany({
            where: { user_id: staff.id },
          });

          if (userRole.rolePermissions && userRole.rolePermissions.length > 0) {
            const data = userRole.rolePermissions.map((rp) => ({
              user_id: staff.id,
              permission_id: rp.permission_id,
            }));
            await tx.userpermission.createMany({ data, skipDuplicates: true });
          }
        }
      }
    });

    return { success: true, message: 'Xóa nhân viên thành công' };
  }

  async getstaffs(shopid: number) {
    const staffs = await this.prisma.shop_staffs.findMany({
      where: { shop_id: shopid },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            avatar_url: true,
            phone: true,
          },
        },
      },
    });

    return staffs;
  }

  async updatestaffpermission(
    userid: number,
    staffemail: string,
    shopid: number,
    permissionNames: string[],
  ) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const shop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      select: { owner_id: true },
    });

    if (!shop) {
      return { success: false, message: 'Cửa hàng không tồn tại' };
    }

    const isOwner = shop.owner_id === userid;
    const isManager = await this.prisma.shop_staffs.findFirst({
      where: { shop_id: shopid, user_id: userid, is_manager: true },
      select: { id: true },
    });

    if (!isOwner && !isManager) {
      return {
        success: false,
        message: 'Bạn không có quyền quản lý cửa hàng này',
      };
    }

    const staff = await this.prisma.users.findUnique({
      where: { email: staffemail },
      select: { id: true },
    });

    if (!staff) {
      return { success: false, message: 'Nhân viên không tồn tại' };
    }

    const staffInShop = await this.prisma.shop_staffs.findFirst({
      where: { shop_id: shopid, user_id: staff.id },
    });

    if (!staffInShop) {
      return { success: false, message: 'Nhân viên không thuộc cửa hàng này' };
    }

    if (staff.id === shop.owner_id) {
      return {
        success: false,
        message: 'Không thể thay đổi quyền của chủ cửa hàng',
      };
    }

    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: permissionNames } },
      select: { id: true, name: true },
    });

    if (permissions.length === 0) {
      return { success: false, message: 'Không tìm thấy quyền hợp lệ' };
    }

    if (permissions.length !== permissionNames.length) {
      const foundNames = permissions.map((p) => p.name);
      const notFound = permissionNames.filter(
        (name) => !foundNames.includes(name),
      );
      return {
        success: false,
        message: `Các quyền không tồn tại: ${notFound.join(', ')}`,
      };
    }

    const data = permissions.map((p) => ({
      user_id: staff.id,
      permission_id: p.id,
    }));

    await this.prisma.userpermission.createMany({
      data,
      skipDuplicates: true,
    });

    return { success: true, message: 'Cập nhật quyền nhân viên thành công' };
  }

  async deletestaffpermission(
    userid: number,
    staffemail: string,
    shopid: number,
    permissionNames: string[],
  ) {
    // Permission check is handled by @RequirePermissions decorator in controller

    const shop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      select: { owner_id: true },
    });

    if (!shop) {
      return { success: false, message: 'Cửa hàng không tồn tại' };
    }

    const isOwner = shop.owner_id === userid;
    const isManager = await this.prisma.shop_staffs.findFirst({
      where: { shop_id: shopid, user_id: userid, is_manager: true },
      select: { id: true },
    });

    if (!isOwner && !isManager) {
      return {
        success: false,
        message: 'Bạn không có quyền quản lý cửa hàng này',
      };
    }

    const staff = await this.prisma.users.findUnique({
      where: { email: staffemail },
      select: { id: true },
    });

    if (!staff) {
      return { success: false, message: 'Nhân viên không tồn tại' };
    }

    const staffInShop = await this.prisma.shop_staffs.findFirst({
      where: { shop_id: shopid, user_id: staff.id },
    });

    if (!staffInShop) {
      return { success: false, message: 'Nhân viên không thuộc cửa hàng này' };
    }

    if (staff.id === shop.owner_id) {
      return {
        success: false,
        message: 'Không thể xóa quyền của chủ cửa hàng',
      };
    }

    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: permissionNames } },
      select: { id: true, name: true },
    });

    if (permissions.length === 0) {
      return { success: false, message: 'Không tìm thấy quyền hợp lệ' };
    }

    const permissionIds = permissions.map((p) => p.id);

    const deleted = await this.prisma.userpermission.deleteMany({
      where: {
        user_id: staff.id,
        permission_id: { in: permissionIds },
      },
    });

    return {
      success: true,
      message: `Đã xóa ${deleted.count} quyền của nhân viên`,
      deleted_count: deleted.count,
    };
  }

  async getpermissionstaff(shopid: number, staffemail: string) {
    const staff = await this.prisma.users.findUnique({
      where: { email: staffemail },
      select: { id: true },
    });
    if (!staff) {
      return { message: 'Nhân viên không tồn tại' };
    }

    const staffInShop = await this.prisma.shop_staffs.findFirst({
      where: { shop_id: shopid, user_id: staff.id },
    });

    if (!staffInShop) {
      return { success: false, message: 'Nhân viên không thuộc cửa hàng này' };
    }

    const permission = await this.prisma.userpermission.findMany({
      where: { user_id: staff.id },
      include: { permission: { select: { name: true } } },
    });

    if (!permission || permission.length === 0) {
      return [] as string[];
    }

    const permissionname = permission
      .map((p) => p.permission?.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0);

    return permissionname;
  }

  async getproduct(shopid: number) {
    const ishasshop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      select: { id: true },
    });
    if (!ishasshop) {
      return { message: 'Shop id không tồn tại' };
    }

    const products = await this.prisma.products.findMany({
      where: { shop_id: shopid },
    });
  }

  async getShopDetails(shopid: number) {
    const shop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            full_name: true,
            avatar_url: true,
            phone: true,
          },
        },
        _count: {
          select: {
            shop_staffs: true,
            products: true,
          },
        },
      },
    });

    if (!shop) {
      return { success: false, message: 'Shop not found' };
    }

    return {
      success: true,
      data: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        logo_url: shop.logo_url,
        cover_url: shop.cover_url,
        phone: shop.phone,
        email: shop.email,
        is_verified: shop.is_verified,
        created_at: shop.created_at,
        updated_at: shop.updated_at,
        owner: shop.owner,
        staff_count: shop._count.shop_staffs,
        product_count: shop._count.products,
      },
    };
  }
}

