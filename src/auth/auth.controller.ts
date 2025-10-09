import {  Controller, Get, Req, UseGuards,Post,Body, BadRequestException, Res, Headers } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
@Controller('auth')
export class AuthController {
  constructor(
        private readonly authService: AuthService,
        private readonly mailerService: MailerService
    ) {}

    @Post('register')
    async register(@Body() body: { email?: string; full_name?: string; phone?: string; }) {
    if (!body || !body.email) {
      throw new BadRequestException('email is required');
    }
        const password = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(password, 10);
        try {
            await this.mailerService
                        .sendMail({
              to: `${body.email}`,
                            subject: 'Đăng ký tài khoản',
                                text: `Mật khẩu tạm thời của bạn là: ${password}`,  
                                html: `Mật khẩu tạm thời của bạn là: ${password}`, 
                            });
                            } catch (error) {
                            console.error('Error sending email:', error);
                            return { success: false, message: 'Email không tồn tại' };
                            }
    return this.authService.register(body.email, body.full_name ?? '', body.phone ?? '', hashedPassword);
    }

    @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body || !body.email || !body.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.authService.login(body.email, body.password);
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
            await this.mailerService
                        .sendMail({
                            to: `${body.email}`, 
                            subject: 'Quên mật khẩu',
                                text: `Mật khẩu mới của bạn là: ${newPassword}`,
                                html: `Mật khẩu mới của bạn là: ${newPassword}`,
                            });
                            }
            catch (error) {
            return { success: false, message: 'Email không tồn tại' };
            }
        await this.authService.changepassword_forgotpassword(body.email, hashedPassword);

        return { success: true, message: 'Mật khẩu mới đã được gửi đến email của bạn' };
    }

    @Post('change-password')
    async changePassword(@Body() body: { userid?: number; currentPassword?: string; newPassword?: string }) {
    if (!body || !body.userid || !body.currentPassword || !body.newPassword) {
        throw new BadRequestException('email, currentPassword, and newPassword are required');
    }
    return this.authService.changepassword(body.userid, body.currentPassword, body.newPassword);
    }


  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // chuyển hướng sang Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req, @Res() res: Response) {
    console.log('OAuth user (Google):', req.user);
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Nhanh: đính kèm token demo qua query để frontend bắt và hiển thị toast
    try {
      const payload = { uid: req.user?.id, t: Date.now() };
      const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
      return res.redirect(`${frontend}/?oauth=google&token=${encodeURIComponent(token)}`);
    } catch {
      return res.redirect(frontend);
    }
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  facebookCallback(@Req() req, @Res() res: Response) {
    console.log('OAuth user (Facebook):', req.user);
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const payload = { uid: req.user?.id, t: Date.now() };
      const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
      return res.redirect(`${frontend}/?oauth=facebook&token=${encodeURIComponent(token)}`);
    } catch {
      return res.redirect(frontend);
    }
  }

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    try {
      if (!authorization) return { user: null };
      const [scheme, token] = authorization.split(' ');
      if (scheme?.toLowerCase() !== 'bearer' || !token) return { user: null };
      // Demo: token là base64url của { uid }
      const payloadStr = Buffer.from(token, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadStr);
      if (!payload?.uid) return { user: null };
      const user = await this.authService.getUserById(Number(payload.uid));
      return { user };
    } catch {
      return { user: null };
    }
  }
}
