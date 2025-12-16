import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RefreshAccessTokenDto } from './dto/refresh-access-token.dto';
import { ExchangeTokenDto } from './dto/exchange-token.dto';
import { CreateOAuthCodeDto } from './dto/create-oauth-code.dto';
import { MailerService } from '@nestjs-modules/mailer';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDeviceOtpDto } from './dto/verifed-email-otp.dto';
import { users } from '@prisma/client';
import ERROR_CODE from './constants/error_code';

@Injectable()
export class AuthService {
  constructor(
    private readonly PrismaService: PrismaService,
    private readonly mailerService: MailerService,
    private jwtService: JwtService,
  ) {}
  async register(registerDto: RegisterDto) {
    const { email, full_name, phone, device_register } = registerDto;

    const existingUser = await this.existuser(email);

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const roleUser = await this.PrismaService.role.findUnique({
      where: { name: 'user' },
      include: {
        rolePermissions: { select: { permission_id: true } },
      },
    });

    if (!roleUser) {
      throw new InternalServerErrorException('Không tìm thấy role user');
    }

    const temporaryPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const newUser = await this.PrismaService.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          email,
          full_name,
          device_register,
          phone: phone ?? '',
          password_hash: hashedPassword,
          avatar_url: '',
          role_id: roleUser.id,
          firstlogin: true,
        },
      });

      if (roleUser.rolePermissions?.length) {
        await tx.userpermission.createMany({
          data: roleUser.rolePermissions.map((rp) => ({
            user_id: user.id,
            permission_id: rp.permission_id,
          })),
        });
      }

      return user;
    });

    await this.mailerService.sendMail({
      to: email,
      subject: 'Chào mừng bạn đến với Beauty Shop',
      html: `
      <h2>Chào mừng ${full_name}!</h2>
      <p>Tài khoản của bạn đã được tạo thành công.</p>
      <p><strong>Mật khẩu tạm thời:</strong> ${temporaryPassword}</p>
      <p>Vui lòng đăng nhập và đổi mật khẩu ngay lần đầu.</p>
    `,
    });

    return {
      success: true,
      message: 'Đăng ký thành công. Mật khẩu tạm đã được gửi về email.',
      email,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    // Kiểm tra device đã tồn tại refresh token chưa
    const existingToken = await this.PrismaService.refresh_tokens.findFirst({
      where: {
        user_id: user.id,
        device_id: dto.device_id,
      },
    });

    if (existingToken) {
      return this.issueTokens(user, dto.device_id, dto.device_name);
    }

    // Lần đầu login, kiểm tra device_id có trùng với device_register không
    if (
      user.device_register &&
      user.device_register === dto.device_id &&
      user.firstlogin
    ) {
      // Cấp token luôn mà không gửi OTP
      return this.issueTokens(user, dto.device_id, dto.device_name);
    }

    // Nếu thiết bị mới và khác device_register -> gửi OTP
    await this.sendDeviceOtp(user, dto.device_id, dto.device_name);
    return {
      success: false,
      code: 'DEVICE_VERIFICATION_REQUIRED',
      device_id: dto.device_id,
    };
  }
  async sendDeviceOtp(user: users, deviceId: string, deviceName: string) {
    const otp = this.generateOtp(); // 6 số
    const hashedOtp = await bcrypt.hash(otp, 10);

    await this.PrismaService.device_otps.create({
      data: {
        user_id: user.id,
        device_id: deviceId,
        otp_hash: hashedOtp,
        expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 phút
      },
    });

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Xác minh thiết bị mới',
      html: `<p>Mã OTP của bạn là <b>${otp}</b></p>`,
    });
  }
  async verifyDevice(dto: VerifyDeviceOtpDto) {
    const { email, device_id, otp, device_name } = dto;

    const user = await this.PrismaService.users.findUnique({
      where: { email },
    });

    if (!user) throw new UnauthorizedException('INVALID_CREDENTIALS');

    const deviceOtp = await this.PrismaService.device_otps.findFirst({
      where: {
        user_id: user.id,
        device_id,
        expires_at: { gt: new Date() },
      },
    });

    if (!deviceOtp) throw new UnauthorizedException('OTP_EXPIRED');

    const isValidOtp = await bcrypt.compare(otp, deviceOtp.otp_hash);
    if (!isValidOtp) throw new UnauthorizedException('INVALID_OTP');

    // Xóa OTP
    await this.PrismaService.device_otps.delete({
      where: { id: deviceOtp.id },
    });

    // Cấp token và lưu refresh token cho device
    return this.issueTokens(user, device_id, device_name);
  }

  private async issueTokens(user: any, device_id: string, device_name: string) {
    const payload = { sub: user.id, email: user.email };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    // Lưu refresh token theo device
    await this.PrismaService.refresh_tokens.upsert({
      where: { device_id },
      update: {
        token: refresh_token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        device_name,
        is_revoked: false,
      },
      create: {
        user_id: user.id,
        device_id,
        device_name,
        token: refresh_token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      success: true,
      access_token,
      refresh_token,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.PrismaService.users.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              select: {
                permission: {
                  select: { name: true },
                },
              },
            },
          },
        },
        userPermissions: {
          select: {
            permission: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!user || !user.is_active || user.is_deleted) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    if (!user.password_hash) {
      throw new UnauthorizedException('PASSWORD_NOT_SET');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return user;
  }

  async existingDevice(userId: number, device_id: string): Promise<boolean> {
    const device = await this.PrismaService.refresh_tokens.findFirst({
      where: {
        user_id: userId,
        device_id,
      },
    });

    return !!device;
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

  async getUserByEmail(email: string) {
    return await this.PrismaService.users.findUnique({
      where: { email },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async createOAuthCode(dto: CreateOAuthCodeDto) {
    const code = Math.random().toString().slice(-6);
    const saveCode = await this.PrismaService.oauth_login_codes.create({
      data: {
        code,
        user_id: dto.user_id,
        device_id: dto.device_id,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
    return saveCode.code;
  }

  async exchangeToken(dto: ExchangeTokenDto) {}

  async refreshToken(dto: RefreshAccessTokenDto) {
    const { token, device_id } = dto;

    let payload;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException({
        code: ERROR_CODE.REFRESH_TOKEN_INVALID,
      });
    }

    const userId = payload.sub;

    const tokenRecord = await this.PrismaService.refresh_tokens.findFirst({
      where: {
        user_id: userId,
        device_id,
        expires_at: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException({
        code: ERROR_CODE.REFRESH_TOKEN_INVALID,
      });
    }

    const newAccessToken = await this.jwtService.signAsync(
      {
        sub: userId,
      },
      {
        expiresIn: '15m',
        secret: process.env.JWT_ACCESS_SECRET,
      },
    );

    return {
      access_token: newAccessToken,
    };
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

  /**
   * Get current user profile by userId (extracted from JWT)
   * Used by /auth/me endpoint
   */
  async getCurrentUser(userId: number) {
    const user = await this.PrismaService.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        phone: true,
        story: true,
        created_at: true,
        updated_at: true,
        firstlogin: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar: user.avatar_url,
      phone: user.phone,
      story: user.story,
      role: user.role?.name || 'user',
      created_at: user.created_at,
      updated_at: user.updated_at,
      firstlogin: user.firstlogin,
    };
  }
  private generateOtp(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }
  async logout(userId: number, deviceId: string, all: boolean) {
    if (all) {
      // Logout tất cả các device: set is_revoked = true cho tất cả refresh_tokens
      await this.PrismaService.refresh_tokens.updateMany({
        where: { user_id: userId },
        data: { is_revoked: true },
      });

      return { success: true, message: 'Đã logout tất cả thiết bị' };
    }

    // Logout chỉ device hiện tại
    const token = await this.PrismaService.refresh_tokens.findUnique({
      where: { device_id: deviceId },
    });

    if (!token || token.user_id !== userId) {
      return {
        success: false,
        message: 'Device không tồn tại hoặc không thuộc user',
      };
    }

    await this.PrismaService.refresh_tokens.update({
      where: { device_id: deviceId },
      data: { is_revoked: true },
    });

    return { success: true, message: 'Đã logout thiết bị hiện tại' };
  }
}
