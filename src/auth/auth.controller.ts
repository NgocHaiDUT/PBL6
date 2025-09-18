import {  Controller, Get, Req, UseGuards,Post,Body  } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
@Controller('auth')
export class AuthController {
  constructor(
        private readonly authService: AuthService,
        private readonly prisma: PrismaService,
        private readonly mailerService: MailerService
    ) {}

  @Post('register')
    async register(@Body() body: { email: string; full_name: string; phone: string; password: string }) {
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
                            return { success: false, message: 'Email không tồn tại' };
                            }
        return this.authService.register(body.email, body.full_name, body.phone, hashedPassword);
    }


  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // chuyển hướng sang Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req) {
    // req.user chứa thông tin user Google
    return req.user;
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  facebookCallback(@Req() req) {
    return req.user;
  }
}
