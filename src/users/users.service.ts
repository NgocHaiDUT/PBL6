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

  async findOne(id: number): Promise<UserEntity> {
    const user = await this.getUserOrThrow(id);
    return this.sanitizeUser(user);
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
}
