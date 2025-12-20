import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) { }

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

    // Allow admin users as well
    const caller = await this.prisma.users.findUnique({
      where: { id: userid },
      select: { role: { select: { name: true } } },
    });

    const isAdmin = caller?.role?.name === 'admin';

    if (!isOwner && !isManager && !isAdmin) {
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

    // If the target user is an owner of any shop, they cannot be added as staff
    if (isshopowner) {
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

    // Validate permissions tồn tại trong database
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

    // Danh sách SHOP permissions (không bao gồm USER permissions)
    const shopPermissionNames = [
      'manage_shop_staff',
      'edit_profile_shop',
      'manage_shop_admin',
      'manage_order',
      'try_on_tester',
      'chat_with_customer',
      'manage_shop_setting',
      'view_dashboard',
      'view_shop_tutorial',
      'manage_product',
      'manage_brands',
      'manage_categorys',
      'manage_shop_address',
    ];

    // Lấy IDs của tất cả SHOP permissions để xóa
    const shopPermissions = await this.prisma.permission.findMany({
      where: { name: { in: shopPermissionNames } },
      select: { id: true },
    });

    const shopPermissionIds = shopPermissions.map((p) => p.id);

    // Thực hiện update trong transaction
    await this.prisma.$transaction(async (tx) => {
      // Xóa TẤT CẢ shop permissions hiện tại của staff
      const deleteResult = await tx.userpermission.deleteMany({
        where: {
          user_id: staff.id,
          permission_id: { in: shopPermissionIds },
        },
      });

      // Thêm permissions mới
      const data = permissions.map((p) => ({
        user_id: staff.id,
        permission_id: p.id,
      }));

      const createResult = await tx.userpermission.createMany({
        data,
        skipDuplicates: true,
      });
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

  async getallpermissionswithstatus(shopid: number, staffemail: string) {
    // Verify staff exists and belongs to shop
    const staff = await this.prisma.users.findUnique({
      where: { email: staffemail },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Nhân viên không tồn tại');
    }

    const staffInShop = await this.prisma.shop_staffs.findFirst({
      where: { shop_id: shopid, user_id: staff.id },
    });

    if (!staffInShop) {
      throw new NotFoundException('Nhân viên không thuộc cửa hàng này');
    }

    // Get all available permissions
    const allPermissions = await this.prisma.permission.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    // Get staff's current permissions
    const staffPermissions = await this.prisma.userpermission.findMany({
      where: { user_id: staff.id },
      select: { permission_id: true },
    });

    const staffPermissionIds = new Set(staffPermissions.map(sp => sp.permission_id));

    // Map all permissions with isGranted status
    const permissionsWithStatus = allPermissions.map(permission => ({
      id: permission.id,
      name: permission.name,
      isGranted: staffPermissionIds.has(permission.id)
    }));

    return permissionsWithStatus;
  }

  async getproduct(shopid: number) {
    const ishasshop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      select: { id: true },
    });
    if (!ishasshop) {
      return { success: false, message: 'Shop id không tồn tại' };
    }

    const products = await this.prisma.products.findMany({
      where: { shop_id: shopid },
    });
    return { success: true, data: products };
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
        shop_staffs: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                full_name: true,
                avatar_url: true,
                phone: true,
                role: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!shop) {
      return { success: false, message: 'Shop not found' };
    }

    // Get follower count - counting users following shop owner
    const followerCount = await this.prisma.follows.count({
      where: { following_id: shop.owner_id },
    });

    // Get published AND approved products for shop
    const publishedProducts = await this.prisma.products.findMany({
      where: {
        shop_id: shopid,
        is_published: true,
        moderation_status: 'approved', // Only count approved products
      },
      select: {
        id: true,
        avg_rating: true,
      },
    });

    // Calculate average rating across all products
    const totalRating = publishedProducts.reduce(
      (sum, p) => sum + (p.avg_rating ? Number(p.avg_rating) : 0),
      0,
    );
    const avgShopRating =
      publishedProducts.length > 0
        ? totalRating / publishedProducts.length
        : 0;

    // Get total review count
    const totalReviews = await this.prisma.reviews.count({
      where: {
        product: {
          shop_id: shopid,
        },
      },
    });

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
        staffs: shop.shop_staffs.map((staff) => ({
          id: staff.id,
          user_id: staff.user_id,
          is_manager: staff.is_manager,
          created_at: staff.created_at,
          user: {
            id: staff.user.id,
            email: staff.user.email,
            full_name: staff.user.full_name,
            avatar_url: staff.user.avatar_url,
            phone: staff.user.phone,
            role: staff.user.role?.name,
          },
        })),
        staff_count: shop.shop_staffs.length,
        product_count: shop._count.products,
      },
    };
  }

  async getShops(
    page: number = 1,
    limit: number = 10,
    search?: string,
    isVerified?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isVerified !== undefined) {
      where.is_verified = isVerified;
    }

    const [shops, total] = await Promise.all([
      this.prisma.shops.findMany({
        where,
        skip,
        take: limit,
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              full_name: true,
              avatar_url: true,
            },
          },
          _count: {
            select: {
              shop_staffs: true,
              products: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.shops.count({ where }),
    ]);

    return {
      success: true,
      data: shops.map((shop) => ({
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
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async banShop(userid: number, shopid: number) {
    // Check if user is admin
    const user = await this.prisma.users.findUnique({
      where: { id: userid },
      select: {
        role: {
          select: { name: true },
        },
      },
    });

    if (user?.role?.name !== 'admin') {
      return {
        success: false,
        message: 'Chỉ admin mới có quyền ban shop',
      };
    }

    // Check if shop exists
    const shop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      select: { id: true, is_verified: true, name: true },
    });

    if (!shop) {
      return { success: false, message: 'Cửa hàng không tồn tại' };
    }

    // Update shop verification status
    await this.prisma.shops.update({
      where: { id: shopid },
      data: {
        is_verified: false,
        updated_at: new Date(),
      },
    });

    return {
      success: true,
      message: `Shop "${shop.name}" đã bị ban (is_verified = false)`,
    };
  }

  async updateShop(
    userid: number,
    shopid: number,
    updateData: {
      name?: string;
      description?: string;
      logo_url?: string;
      cover_url?: string;
      phone?: string;
      email?: string;
    },
  ) {
    // Check if shop exists
    const shop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      select: { owner_id: true },
    });

    if (!shop) {
      return { success: false, message: 'Cửa hàng không tồn tại' };
    }

    // Check if user is admin, owner, or manager
    const user = await this.prisma.users.findUnique({
      where: { id: userid },
      select: {
        role: {
          select: { name: true },
        },
      },
    });

    const isAdmin = user?.role?.name === 'admin';
    const isOwner = shop.owner_id === userid;
    const isManager = await this.prisma.shop_staffs.findFirst({
      where: { shop_id: shopid, user_id: userid, is_manager: true },
      select: { id: true },
    });

    if (!isAdmin && !isOwner && !isManager) {
      return {
        success: false,
        message: 'Bạn không có quyền chỉnh sửa cửa hàng này',
      };
    }

    // Generate slug if name is updated
    let slug: string | undefined;
    if (updateData.name) {
      slug = updateData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Check if slug already exists (for other shops)
      const existingShop = await this.prisma.shops.findFirst({
        where: {
          slug,
          NOT: { id: shopid },
        },
      });

      if (existingShop) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    // Update shop
    const updatedShop = await this.prisma.shops.update({
      where: { id: shopid },
      data: {
        ...updateData,
        ...(slug && { slug }),
        updated_at: new Date(),
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Cập nhật thông tin cửa hàng thành công',
      data: {
        id: updatedShop.id,
        name: updatedShop.name,
        slug: updatedShop.slug,
        description: updatedShop.description,
        logo_url: updatedShop.logo_url,
        cover_url: updatedShop.cover_url,
        phone: updatedShop.phone,
        email: updatedShop.email,
        is_verified: updatedShop.is_verified,
        created_at: updatedShop.created_at,
        updated_at: updatedShop.updated_at,
        owner: updatedShop.owner,
      },
    };
  }

  // Public method - no auth required, limited info
  async getPublicShopDetails(shopid: number, currentUserId?: number) {
    const shop = await this.prisma.shops.findUnique({
      where: { id: shopid },
      include: {
        owner: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
        _count: {
          select: {
            shop_staffs: true,
            shop_follows: true, // Count directly from shop_follows
          },
        },
      },
    });

    if (!shop) {
      return { success: false, message: 'Shop not found' };
    }

    const followerCount = shop._count.shop_follows;

    // Check if current user is following this shop
    let isFollowing = false;
    if (currentUserId) {
      const follow = await this.prisma.shop_follows.findUnique({
        where: {
          user_id_shop_id: {
            user_id: currentUserId,
            shop_id: shopid
          }
        }
      });
      isFollowing = !!follow;
    }

    // Get published AND approved products for shop
    const publishedProducts = await this.prisma.products.findMany({
      where: {
        shop_id: shopid,
        is_published: true,
        moderation_status: 'approved', // Only count approved products
      },
      select: {
        id: true,
        avg_rating: true,
      },
    });

    // Calculate average rating across all products
    const totalRating = publishedProducts.reduce(
      (sum, p) => sum + (p.avg_rating ? Number(p.avg_rating) : 0),
      0,
    );
    const avgShopRating =
      publishedProducts.length > 0
        ? totalRating / publishedProducts.length
        : 0;

    // Get total review count (only for published products)
    const totalReviews = await this.prisma.reviews.count({
      where: {
        product: {
          shop_id: shopid,
          is_published: true,
        },
      },
    });

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
        product_count: publishedProducts.length, // Only count published products
        follower_count: followerCount,
        is_following: isFollowing,
        avg_rating: Number(avgShopRating.toFixed(1)),
        total_reviews: totalReviews,
      },
    };
  }

  async followShop(userId: number, shopId: number) {
    // Check if shop exists
    const shop = await this.prisma.shops.findUnique({
      where: { id: shopId }
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.shop_follows.findUnique({
      where: {
        user_id_shop_id: {
          user_id: userId,
          shop_id: shopId
        }
      }
    });

    if (existingFollow) {
      return { success: true, message: 'Already following' };
    }

    await this.prisma.shop_follows.create({
      data: {
        user_id: userId,
        shop_id: shopId
      }
    });

    return { success: true, message: 'Followed shop successfully' };
  }

  async unfollowShop(userId: number, shopId: number) {
    const deleteResult = await this.prisma.shop_follows.deleteMany({
      where: {
        user_id: userId,
        shop_id: shopId
      }
    });

    if (deleteResult.count === 0) {
      return { success: false, message: 'Not following this shop' };
    }

    return { success: true, message: 'Unfollowed shop successfully' };
  }

  async getShopFollowStatus(userId: number, shopId: number) {
    const follow = await this.prisma.shop_follows.findUnique({
      where: {
        user_id_shop_id: {
          user_id: userId,
          shop_id: shopId
        }
      }
    });
    return { is_following: !!follow };
  }

  // ============================================
  // PUBLIC METHODS (No authentication required)
  // ============================================

  /**
   * Get shop public profile - No authentication required
   */
  async getShopPublicProfile(shopId: number) {
    const shop = await this.prisma.shops.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo_url: true,
        cover_url: true,
        phone: true,
        email: true,
        is_verified: true,
        created_at: true,
        _count: {
          select: {
            products: true,
            shop_staffs: true,
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // TODO: Calculate real rating and response rate from orders/reviews
    // For now, return mock data
    const rating = 4.8;
    const responseRate = 99;
    const followersCount = 12500; // TODO: Implement followers system

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
        rating,
        response_rate: responseRate,
        followers_count: followersCount,
        product_count: shop._count.products,
        created_at: shop.created_at,
      },
    };
  }

  /**
   * Get shop products with pagination - No authentication required
   */
  async getShopProducts(shopId: number, query: any) {
    const { page = 1, limit = 20, sortBy = 'created_at', order = 'desc' } = query;

    // Verify shop exists
    const shop = await this.prisma.shops.findUnique({
      where: { id: shopId },
      select: { id: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const skip = (page - 1) * limit;

    // Build orderBy object
    const orderByField: any = {};
    orderByField[sortBy] = order;

    // Get products with pagination
    const [products, total] = await Promise.all([
      this.prisma.products.findMany({
        where: {
          shop_id: shopId,
          is_published: true, // ✅ Only show published products
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          avg_rating: true,
          review_count: true,
          created_at: true,
          product_media: {
            select: {
              url: true,
              sort_order: true,
            },
            orderBy: {
              sort_order: 'asc',
            },
            take: 1,
          },
          product_variants: {
            select: {
              price: true,
              compare_at_price: true,
              stock: true,
            },
            orderBy: {
              price: 'asc',
            },
            take: 1,
          },
        },
        orderBy: orderByField,
        skip,
        take: limit,
      }),
      this.prisma.products.count({
        where: {
          shop_id: shopId,
          is_published: true,
        },
      }),
    ]);

    return {
      success: true,
      data: products.map(product => {
        const variant = product.product_variants[0];
        const soldCount = 0; // TODO: Calculate from orders

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: variant ? Number(variant.price) : 0,
          discount_price: variant?.compare_at_price ? Number(variant.compare_at_price) : null,
          stock_quantity: variant?.stock || 0,
          sold_count: soldCount,
          rating: product.avg_rating ? Number(product.avg_rating) : 0,
          review_count: product.review_count,
          image_url: product.product_media[0]?.url || null,
          created_at: product.created_at.toISOString(),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

}
