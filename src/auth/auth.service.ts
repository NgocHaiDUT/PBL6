import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
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
  ) { }
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

    // ✅ Kiểm tra device đã tồn tại refresh token ACTIVE chưa
    // QUAN TRỌNG: Phải check is_revoked = false để phân biệt device mới vs device đã logout
    const existingToken = await this.PrismaService.refresh_tokens.findFirst({
      where: {
        user_id: user.id,
        device_id: dto.device_id,
        is_revoked: false, // ✅ Chỉ tìm token chưa bị revoke
        expires_at: { gt: new Date() }, // ✅ Và chưa hết hạn
      },
    });

    if (existingToken) {
      // ✅ Device đã tồn tại và có token active → LOGIN LẠI CÙNG THIẾT BỊ
      // → UPDATE record cũ (rotate token)
      return this.issueTokens(user, dto.device_id, dto.device_name);
    }

    // ✅ THIẾT BỊ MỚI → Revoke tất cả thiết bị cũ của user này
    await this.PrismaService.refresh_tokens.updateMany({
      where: {
        user_id: user.id,
        is_revoked: false,
      },
      data: {
        is_revoked: true,
        updated_at: new Date(),
      },
    });

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

  /**
   * Login endpoint for admin users only
   * Behaves like normal login but requires user's role to be 'admin'
   */
  async adminLogin(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    // Ensure user has admin role
    const roleName = user.role?.name || null;
    if (roleName !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }

    // Reuse same device/token flow as regular login
    const existingToken = await this.PrismaService.refresh_tokens.findFirst({
      where: {
        user_id: user.id,
        device_id: dto.device_id,
      },
    });

    if (existingToken) {
      return this.issueTokens(user, dto.device_id, dto.device_name);
    }

    if (
      user.device_register &&
      user.device_register === dto.device_id &&
      user.firstlogin
    ) {
      return this.issueTokens(user, dto.device_id, dto.device_name);
    }

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
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      console.error(`[Auth] Verify failed - User not found: ${email}`);
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const deviceOtp = await this.PrismaService.device_otps.findFirst({
      where: {
        user_id: user.id,
        device_id,
        expires_at: { gt: new Date() },
      },
    });

    if (!deviceOtp) {
      console.error(`[Auth] Verify failed - OTP expired or not found for user ${user.id}, device: ${device_id}`);
      throw new UnauthorizedException('OTP_EXPIRED');
    }

    const isValidOtp = await bcrypt.compare(otp, deviceOtp.otp_hash);
    if (!isValidOtp) {
      console.error(`[Auth] Verify failed - Invalid OTP for user ${user.id}`);
      throw new UnauthorizedException('INVALID_OTP');
    }

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
      expiresIn: '5m',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    // ✅ Lưu refresh token theo device với unique constraint (user_id, device_id)
    // Cho phép nhiều user cùng 1 device_id mà không conflict với nhau

    try {
      const savedToken = await this.PrismaService.refresh_tokens.upsert({
        where: {
          user_id_device_id: {
            user_id: user.id,
            device_id: device_id,
          },
        },
        update: {
          token: refresh_token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          device_name, // Cập nhật device_name nếu có thay đổi
          is_revoked: false, // Reset revoked flag nếu đã logout trước đó
          updated_at: new Date(),
        },
        create: {
          user_id: user.id,
          device_id,
          device_name,
          token: refresh_token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          is_revoked: false,
        },
      });
    } catch (error) {
      console.error('[Auth] Error saving token with upsert, trying delete+create approach:', error);

      // Fallback: Delete existing token and create new one
      await this.PrismaService.refresh_tokens.deleteMany({
        where: {
          user_id: user.id,
          device_id: device_id,
        },
      });

      const savedToken = await this.PrismaService.refresh_tokens.create({
        data: {
          user_id: user.id,
          device_id,
          device_name,
          token: refresh_token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          is_revoked: false,
        },
      });
    }

    // Collect permissions from role and user
    const rolePermissions = user.role?.rolePermissions?.map(rp => rp.permission.name) || [];
    const userPermissions = user.userPermissions?.map(up => up.permission.name) || [];
    const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];

    // ✅ Trả về cả thông tin user
    return {
      success: true,
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        phone: user.phone,
        story: user.story,
        role: user.role?.name || 'user',
        firstlogin: user.firstlogin,
        permissions: allPermissions,
      },
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

  async getUserEmail(userId: number) {
    const user = await this.PrismaService.users.findUnique({
      where: { id: userId },
    });
    return user?.email;
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
      data: {
        password_hash: newPassword,
        firstlogin: true, // ✅ Bắt buộc đổi mật khẩu sau khi reset
        updated_at: new Date(),
      },
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
    console.log('[createOAuthCode] Received DTO:', dto);
    console.log('[createOAuthCode] user_id type:', typeof dto.user_id, 'value:', dto.user_id);
    console.log('[createOAuthCode] device_id type:', typeof dto.device_id, 'value:', dto.device_id);

    if (!dto.device_id) {
      throw new BadRequestException('device_id is required');
    }

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

  async exchangeToken(dto: ExchangeTokenDto) {
    const { code, device_id, device_name } = dto;

    try {
      // Find OAuth code in database
      const oauthCode = await this.PrismaService.oauth_login_codes.findFirst({
        where: {
          code,
          device_id,
          expires_at: { gt: new Date() },
        },
        include: {
          user: true,
        },
      });

      if (!oauthCode) {
        throw new UnauthorizedException({
          code: ERROR_CODE.OAUTH_CODE_INVALID,
          message: 'Invalid OAuth code',
        });
      }

      // Check if code is expired
      if (oauthCode.expires_at < new Date()) {
        await this.PrismaService.oauth_login_codes.delete({
          where: { code },
        });
        throw new UnauthorizedException({
          code: ERROR_CODE.OAUTH_CODE_EXPIRED,
          message: 'OAuth code has expired',
        });
      }

      // Verify device_id matches
      if (oauthCode.device_id !== device_id) {
        throw new UnauthorizedException({
          code: ERROR_CODE.OAUTH_CODE_INVALID,
          message: 'Device ID mismatch',
        });
      }

      // Delete the used code
      await this.PrismaService.oauth_login_codes.delete({
        where: { code },
      });

      // Get user data with role and permissions
      const user = await this.PrismaService.users.findUnique({
        where: { id: oauthCode.user_id },
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

      if (!user) {
        throw new UnauthorizedException({
          code: ERROR_CODE.OAUTH_CODE_INVALID,
          message: 'User not found',
        });
      }

      // Issue tokens using the device info from the code
      const tokens = await this.issueTokens(user, device_id, device_name || 'Unknown Device');

      return tokens;
    } catch (error) {
      console.error('[Auth] exchangeToken error:', error);
      throw error;
    }
  }

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
        expiresIn: '5m',
        secret: process.env.JWT_ACCESS_SECRET,
      },
    );

    return {
      success: true,
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
        firstlogin: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        userPermissions: {
          select: {
            permission: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar: user.avatar_url,
      phone: user.phone,
      story: user.story,
      role: user.role?.name || 'user',
      permissions: user.userPermissions.map((up) => up.permission.name),
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
      // ✅ LOGOUT ALL: Revoke tất cả refresh_tokens của user
      const result = await this.PrismaService.refresh_tokens.updateMany({
        where: {
          user_id: userId,
          is_revoked: false, // Chỉ revoke những token đang active
        },
        data: {
          is_revoked: true,
          updated_at: new Date(),
        },
      });
      return { success: true, message: `Đã logout tất cả thiết bị (${result.count} devices)` };
    }

    // ✅ LOGOUT THIẾT BỊ HIỆN TẠI: Set is_revoked = true
    // Sử dụng unique constraint (user_id, device_id)
    const token = await this.PrismaService.refresh_tokens.findUnique({
      where: {
        user_id_device_id: {
          user_id: userId,
          device_id: deviceId,
        },
      },
    });

    if (!token) {
      return {
        success: false,
        message: 'Device không tồn tại',
      };
    }

    if (token.is_revoked) {
      return { success: true, message: 'Device đã được logout trước đó' };
    }

    await this.PrismaService.refresh_tokens.update({
      where: {
        user_id_device_id: {
          user_id: userId,
          device_id: deviceId,
        },
      },
      data: {
        is_revoked: true,
        updated_at: new Date(),
      },
    });
    return { success: true, message: 'Đã logout thiết bị hiện tại' };
  }
}