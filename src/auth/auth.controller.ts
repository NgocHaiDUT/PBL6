import {
  Controller,
  Get,
  Req,
  UseGuards,
  Post,
  Body,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
    private jwtService: JwtService,
  ) { }

  @Post('register')
  async register(@Body() body: { email?: string; full_name?: string; phone?: string }) {
    if (!body || !body.email || !body.full_name) {
      throw new BadRequestException('email and full_name are required');
    }

    // Tự động tạo mật khẩu tạm thời
    const temporaryPassword = Math.random().toString(36).slice(-8);

    // Gửi email với mật khẩu tạm thời
    try {
      await this.mailerService.sendMail({
        to: body.email,
        subject: 'Chào mừng bạn đến với Beauty Shop - Mật khẩu tạm thời',
        html: `
                    <h2>Chào mừng ${body.full_name}!</h2>
                    <p>Tài khoản của bạn đã được tạo thành công.</p>
                    <p><strong>Mật khẩu tạm thời:</strong> ${temporaryPassword}</p>
                    <p>Vui lòng đăng nhập và đổi mật khẩu ngay lập tức.</p>
                    <p>Mật khẩu này chỉ có hiệu lực cho lần đăng nhập đầu tiên.</p>
                `,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, message: 'Không thể gửi email. Vui lòng kiểm tra lại địa chỉ email.' };
    }

    // Đăng ký với mật khẩu tạm thời
    const result = await this.authService.register(
      body.email,
      body.full_name,
      body.phone ?? '',
      temporaryPassword
    );

    if (result.success) {
      return {
        success: true,
        message: 'Đăng ký thành công! Mật khẩu tạm thời đã được gửi đến email của bạn.',
        email: body.email, // Trả về email để mobile app có thể sử dụng
      };
    }

    return result;
  }

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body || !body.email || !body.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.authService.login(body.email, body.password);
  }

  /**
   * Get current user profile
   * Requires JWT authentication
   * GET /auth/me
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getCurrentUser(@Req() req) {
    const userId = req.user.userId;
    const user = await this.authService.getCurrentUser(userId);

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại');
    }

    return {
      success: true,
      user,
    };
  }


  @Post('forgot-password')
  async forgotPassword(@Body() body: { email?: string }) {
    if (!body || !body.email) {
      throw new BadRequestException('email is required');
    }
    const user = this.authService.existuser(body.email);
    if (!user) {
      return { success: false, message: 'Email không tồn tại' };
    }
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    try {
      await this.mailerService.sendMail({
        to: `${body.email}`,
        subject: 'Quên mật khẩu',
        text: `Mật khẩu mới của bạn là: ${newPassword}`,
        html: `Mật khẩu mới của bạn là: ${newPassword}`,
      });
    } catch (error) {
      return { success: false, message: 'Email không tồn tại' };
    }
    await this.authService.changepassword_forgotpassword(
      body.email,
      hashedPassword,
    );

    return {
      success: true,
      message: 'Mật khẩu mới đã được gửi đến email của bạn',
    };
  }

  @Post('change-password')
  async changePassword(
    @Body()
    body: {
      userid?: number;
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    if (!body || !body.userid || !body.currentPassword || !body.newPassword) {
      throw new BadRequestException(
        'email, currentPassword, and newPassword are required',
      );
    }
    return this.authService.changepassword(
      body.userid,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Post('change-password-first-time')
  async changePasswordFirstTime(@Body() body: { email?: string; temporaryPassword?: string; newPassword?: string }) {
    if (!body || !body.email || !body.temporaryPassword || !body.newPassword) {
      throw new BadRequestException('email, temporaryPassword, and newPassword are required');
    }

    // Xác thực mật khẩu tạm thời
    const loginResult = await this.authService.login(body.email, body.temporaryPassword);

    if (!loginResult.success) {
      return { success: false, message: 'Mật khẩu tạm thời không đúng' };
    }

    // Lấy user từ email
    const user = await this.authService.getUserByEmail(body.email);
    if (!user) {
      return { success: false, message: 'Người dùng không tồn tại' };
    }

    // Đổi mật khẩu và set firstlogin = false
    const result = await this.authService.changePasswordFirstTime(user.id, body.newPassword);

    if (result.success) {
      // Tạo JWT token để tự động đăng nhập
      const payload = { sub: user.id, email: user.email };
      const accessToken = await this.jwtService.signAsync(payload);

      // ✅ Thin response - consistent with login endpoint
      return {
        success: true,
        message: 'Đổi mật khẩu thành công',
        access_token: accessToken,
        requiresPasswordChange: false,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar: user.avatar_url,
          role: user.role?.name || 'user',
          requiresPasswordChange: false,
        },
      };
    }

    return result;
  }


  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // chuyển hướng sang Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req, @Res() res: Response) {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const user = req.user;
      if (!user) {
        return res.redirect(`${frontend}/?oauth_error=user_not_found`);
      }
      const payload = { sub: user.id, email: user.email };
      const accessToken = await this.jwtService.signAsync(payload);
      return res.redirect(
        `${frontend}/auth/callback?access_token=${accessToken}`,
      );
    } catch (error) {
      return res.redirect(`${frontend}/?oauth_error=authentication_failed`);
    }
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() { }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req, @Res() res: Response) {
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const user = req.user;
      if (!user) {
        return res.redirect(`${frontend}/?oauth_error=user_not_found`);
      }
      const payload = { sub: user.id, email: user.email };
      const accessToken = await this.jwtService.signAsync(payload);
      return res.redirect(
        `${frontend}/auth/callback?access_token=${accessToken}`,
      );
    } catch (error) {
      return res.redirect(`${frontend}/?oauth_error=authentication_failed`);
    }
  }
}
