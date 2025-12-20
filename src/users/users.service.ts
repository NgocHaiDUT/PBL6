import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, users } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser(user: users): UserEntity {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  async getPageInfo(): Promise<any> {
    const [totalUsers, activeUsers, roles] = await Promise.all([
      this.prisma.users.count({
        where: { is_deleted: false },
      }),
      this.prisma.users.count({
        where: {
          is_deleted: false,
          is_active: true,
        },
      }),
      this.prisma.role.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        roles,
      },
    };
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const existingUser = await this.prisma.users.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const data: Prisma.usersUncheckedCreateInput = {
      email: createUserDto.email,
      full_name: createUserDto.full_name ?? null,
      phone: createUserDto.phone ?? null,
      avatar_url: createUserDto.avatar_url ?? null,
      is_active: createUserDto.is_active ?? true,
      firstlogin: createUserDto.firstlogin ?? true,
      role_id: createUserDto.role_id ?? null,
    };

    if (createUserDto.password) {
      data.password_hash = await bcrypt.hash(createUserDto.password, 10);
    }

    const user = await this.prisma.users.create({ data });
    return this.sanitizeUser(user);
  }

  async findAll(queryDto: any = {}): Promise<any> {
    const { page = 1, limit = 10, search, is_active, role_id } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.usersWhereInput = {
      is_deleted: false, // Chỉ lấy users chưa bị xóa
    };

    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (role_id !== undefined) {
      where.role_id = role_id;
    }

    // Get total count
    const total = await this.prisma.users.count({ where });

    // Get users with pagination
    const users = await this.prisma.users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const sanitizedUsers = users.map((user) => this.sanitizeUser(user));

    return {
      success: true,
      data: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  private async getUserOrThrow(id: number): Promise<users> {
    const user = await this.prisma.users.findFirst({ 
      where: { 
        id,
        is_deleted: false 
      } 
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async findOne(id: number): Promise<any> {
    const user = await this.prisma.users.findFirst({
      where: { 
        id,
        is_deleted: false 
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
        addresses: {
          orderBy: {
            is_default: 'desc',
          },
        },
      },
    });
    
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // Get total orders count and total spending
    const [totalOrders, orderStats] = await Promise.all([
      this.prisma.orders.count({
        where: {
          user_id: id,
        },
      }),
      this.prisma.orders.aggregate({
        where: {
          user_id: id,
          payment_status: 'paid',
        },
        _sum: {
          total_amount: true,
        },
      }),
    ]);

    const sanitizedUser = this.sanitizeUser(user);
    
    return {
      ...sanitizedUser,
      totalOrders,
      totalSpending: orderStats._sum.total_amount || 0,
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const existingUser = await this.getUserOrThrow(id);

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailTaken = await this.prisma.users.findUnique({
        where: { email: updateUserDto.email },
      });
      if (emailTaken) {
        throw new BadRequestException('Email already exists');
      }
    }

    const data: Prisma.usersUncheckedUpdateInput = {
      updated_at: new Date(),
    };

    if (updateUserDto.email !== undefined) data.email = updateUserDto.email;
    if (updateUserDto.full_name !== undefined) data.full_name = updateUserDto.full_name;
    if (updateUserDto.phone !== undefined) data.phone = updateUserDto.phone;
    if (updateUserDto.avatar_url !== undefined) data.avatar_url = updateUserDto.avatar_url;
    if (updateUserDto.is_active !== undefined) data.is_active = updateUserDto.is_active;
    if (updateUserDto.firstlogin !== undefined) data.firstlogin = updateUserDto.firstlogin;
    if (updateUserDto.role_id !== undefined) data.role_id = updateUserDto.role_id;
    if (updateUserDto.story !== undefined) data.story = updateUserDto.story;

    if (updateUserDto.password) {
      data.password_hash = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.prisma.users.update({
      where: { id },
      data,
    });
    return this.sanitizeUser(user);
  }

  async remove(id: number): Promise<UserEntity> {
    await this.getUserOrThrow(id);
    const user = await this.prisma.users.update({ 
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
      }
    });
    return this.sanitizeUser(user);
  }

  async updateAvatar(id: number, avatarUrl: string): Promise<any> {
    await this.getUserOrThrow(id);
    const user = await this.prisma.users.update({
      where: { id },
      data: {
        avatar_url: avatarUrl,
        updated_at: new Date(),
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Avatar updated successfully',
      data: this.sanitizeUser(user),
    };
  }

  // ================== ROLE & PERMISSION MANAGEMENT ==================

  /**
   * Set role for a user
   */
  async setUserRole(userId: number, roleId: number): Promise<any> {
    // Check if user exists
    await this.getUserOrThrow(userId);

    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} not found`);
    }

    // Update user's role
    const user = await this.prisma.users.update({
      where: { id: userId },
      data: { 
        role_id: roleId,
        updated_at: new Date(),
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `User role updated to ${role.name}`,
      data: this.sanitizeUser(user),
    };
  }

  /**
   * Set permissions for a specific user (user-level permissions)
   */
  async setUserPermissions(userId: number, permissionIds: number[]): Promise<any> {
    // Check if user exists
    await this.getUserOrThrow(userId);

    // Check if all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    // Delete existing user permissions
    await this.prisma.userpermission.deleteMany({
      where: { user_id: userId },
    });

    // Create new user permissions
    const userPermissions = await this.prisma.userpermission.createMany({
      data: permissionIds.map((permissionId) => ({
        user_id: userId,
        permission_id: permissionId,
      })),
    });

    // Fetch updated user permissions
    const updatedPermissions = await this.prisma.userpermission.findMany({
      where: { user_id: userId },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'User permissions updated successfully',
      data: {
        user_id: userId,
        permissions: updatedPermissions.map((up) => up.permission),
      },
    };
  }

  /**
   * Create a new permission
   */
  async createPermission(name: string): Promise<any> {
    // Check if permission already exists
    const existingPermission = await this.prisma.permission.findUnique({
      where: { name },
    });

    if (existingPermission) {
      throw new BadRequestException(`Permission '${name}' already exists`);
    }

    const permission = await this.prisma.permission.create({
      data: { name },
    });

    return {
      success: true,
      message: 'Permission created successfully',
      data: permission,
    };
  }

  /**
   * Set permissions for a role
   */
  async setRolePermissions(roleId: number, permissionIds: number[]): Promise<any> {
    // Check if role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} not found`);
    }

    // Check if all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    // Delete existing role permissions
    await this.prisma.rolepermission.deleteMany({
      where: { role_id: roleId },
    });

    // Create new role permissions
    await this.prisma.rolepermission.createMany({
      data: permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId,
      })),
    });

    // Fetch updated role permissions
    const updatedPermissions = await this.prisma.rolepermission.findMany({
      where: { role_id: roleId },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Permissions updated for role '${role.name}'`,
      data: {
        role_id: roleId,
        role_name: role.name,
        permissions: updatedPermissions.map((rp) => rp.permission),
      },
    };
  }

  /**
   * Get all permissions grouped by category
   */
  async getAllPermissions(): Promise<any> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });

    // Định nghĩa các nhóm permission
    const permissionGroups = {
      USER: {
        groupName: 'User Management',
        groupDescription: 'Quản lý người dùng',
        keywords: ['user', 'view_users', 'create_user', 'update_user', 'delete_user']
      },
      ROLE_MANAGEMENT: {
        groupName: 'Role & Permission Management',
        groupDescription: 'Quản lý vai trò và quyền hạn',
        keywords: ['role', 'permission', 'manage_roles', 'manage_permissions']
      },
      SHOP: {
        groupName: 'Shop Management',
        groupDescription: 'Quản lý cửa hàng',
        keywords: ['shop', 'manage_shop_staff', 'edit_profile_shop']
      },
      PRODUCT: {
        groupName: 'Product Management',
        groupDescription: 'Quản lý sản phẩm',
        keywords: ['product', 'brand', 'category', 'create_product', 'edit_product', 'delete_product', 'manage_brands', 'manage_categorys']
      },
      POST: {
        groupName: 'Post Management',
        groupDescription: 'Quản lý bài viết',
        keywords: ['post', 'create_post', 'edit_post', 'delete_post']
      },
      OTHER: {
        groupName: 'Other Permissions',
        groupDescription: 'Các quyền khác',
        keywords: []
      }
    };

    // Phân loại permissions vào các nhóm
    const groupedPermissions = Object.entries(permissionGroups).map(([groupKey, groupInfo]) => {
      const groupPerms = permissions.filter(perm => {
        // Kiểm tra nếu permission name khớp với keywords
        return groupInfo.keywords.some(keyword => perm.name.includes(keyword));
      });

      return {
        group: groupKey,
        groupName: groupInfo.groupName,
        groupDescription: groupInfo.groupDescription,
        permissions: groupPerms.map(p => ({
          id: p.id,
          name: p.name
        }))
      };
    }).filter(group => group.permissions.length > 0); // Chỉ trả về nhóm có permissions

    return {
      success: true,
      data: groupedPermissions,
      metadata: {
        total: permissions.length,
        groups: groupedPermissions.length
      }
    };
  }

  /**
   * Get all roles with their permissions
   */
  async getAllRoles(): Promise<any> {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        permissions: role.rolePermissions.map((rp) => rp.permission),
      })),
    };
  }

  /**
   * Get user's permissions (from role + user-specific permissions)
   */
  async getUserPermissions(userId: number): Promise<any> {
    await this.getUserOrThrow(userId);

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    const rolePermissions = user?.role?.rolePermissions.map((rp) => rp.permission) || [];
    const userPermissions = user?.userPermissions.map((up) => up.permission) || [];

    // Merge and deduplicate permissions
    const allPermissions = [...rolePermissions, ...userPermissions];
    const uniquePermissions = Array.from(
      new Map(allPermissions.map((p) => [p.id, p])).values()
    );

    return {
      success: true,
      data: {
        user_id: userId,
        role: user?.role ? { id: user.role.id, name: user.role.name } : null,
        permissions: uniquePermissions,
      },
    };
  }
}
