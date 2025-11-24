import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly PrismaService: PrismaService,
    private jwtService: JwtService,
  ) {}
  async register(
    email: string,
    full_name: string,
    phone: string,
    password: string,
  ) {
    const existingUser = await this.PrismaService.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      return { success: false, message: 'Email đã được sử dụng' };
    }
    const roleuserid = await this.PrismaService.role.findUnique({
      where: { name: 'user' },
      include: {
        rolePermissions: {
          select: {
            permission_id: true,
          },
        },
      },
    });

    if (!roleuserid) {
      return {
        success: false,
        message: 'Lỗi hệ thống: Không tìm thấy role user',
      };
    }

    const newUser = await this.PrismaService.users.create({
      data: {
        email: email,
        full_name: full_name,
        phone: phone,
        password_hash: password,
        avatar_url: '',
        role_id: roleuserid.id,
        firstlogin: true,
      },
    });

    if (roleuserid.rolePermissions && roleuserid.rolePermissions.length > 0) {
      const userPermissionsData = roleuserid.rolePermissions.map((rp) => ({
        user_id: newUser.id,
        permission_id: rp.permission_id,
      }));

      await this.PrismaService.userpermission.createMany({
        data: userPermissionsData,
      });
    }

    return {
      success: true,
      message: 'Đăng ký thành công,mật khẩu được gửi về email của bạn',
    };
  }
  async login(email: string, password: string) {
    const user = await this.PrismaService.users.findUnique({
      where: { email },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!user) {
      return { success: false, message: 'Email không tồn tại' };
    } else if (
      !user.password_hash ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return { success: false, message: 'Mật khẩu không đúng' };
    } else {
      const requiresPasswordChange = user.firstlogin === true;
      const payload = { sub: user.id, email: user.email };
      const accessToken = await this.jwtService.signAsync(payload);

      return {
        success: true,
        message: requiresPasswordChange
          ? 'Vui lòng đổi mật khẩu để tiếp tục'
          : 'Đăng nhập thành công',
        user,
        requiresPasswordChange,
        access_token: accessToken,
      };
    }
  }

  async existuser(email: string) {
    const user = await this.PrismaService.users.findUnique({
      where: { email },
    });
    if (!user) {
      return false;
    } else {
      return true;
    }
  }

  async changepassword_forgotpassword(email: string, newPassword: string) {
    await this.PrismaService.users.update({
      where: { email },
      data: { password_hash: newPassword },
    });
    return true;
  }

  async changepassword(
    userid: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.PrismaService.users.findUnique({
      where: { id: userid },
    });
    if (!user) {
      return { success: false, message: 'Người dùng không tồn tại' };
    }
    if (
      !user.password_hash ||
      !(await bcrypt.compare(currentPassword, user.password_hash))
    ) {
      return { success: false, message: 'Mật khẩu hiện tại không đúng' };
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.PrismaService.users.update({
      where: { id: userid },
      data: { password_hash: hashedNewPassword },
    });
    return { success: true, message: 'Đổi mật khẩu thành công' };
  }

  async getUserById(id: number) {
    return await this.PrismaService.users.findUnique({ where: { id } });
  }

  async changePasswordFirstTime(userId: number, newPassword: string) {
    const user = await this.PrismaService.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return { success: false, message: 'Người dùng không tồn tại' };
    }

    if (!user.firstlogin) {
      return { success: false, message: 'Bạn đã đổi mật khẩu rồi' };
    }

    // Validation mật khẩu mới
    if (newPassword.length < 6) {
      return { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
    }

    // Kiểm tra mật khẩu mới có khác mật khẩu cũ không
    if (
      user.password_hash &&
      (await bcrypt.compare(newPassword, user.password_hash))
    ) {
      return { success: false, message: 'Mật khẩu mới phải khác mật khẩu cũ' };
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.PrismaService.users.update({
      where: { id: userId },
      data: {
        password_hash: hashedNewPassword,
        firstlogin: false,
        updated_at: new Date(),
      },
    });

    // Ghi audit log
    await this.PrismaService.audit_logs.create({
      data: {
        actor_id: userId,
        action: 'FIRST_TIME_PASSWORD_CHANGE',
        entity_type: 'users',
        entity_id: userId,
        details: 'User changed password for the first time',
        created_at: new Date(),
      },
    });

    return { success: true, message: 'Đổi mật khẩu thành công' };
  }
}
