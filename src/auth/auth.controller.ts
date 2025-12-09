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
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePasswordFirstTimeDto } from './dto/change-password-first-time.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
    private jwtService: JwtService,
  ) {}

    @Post('register')
    @ApiOperation({ summary: 'Register a new user account' })
    @ApiResponse({ status: 201, description: 'User registered successfully. Temporary password sent to email.' })
    @ApiResponse({ status: 400, description: 'Bad request - Email and full_name are required' })
    @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
    async register(@Body() registerDto: RegisterDto) {
        if (!registerDto || !registerDto.email || !registerDto.full_name) {
            throw new BadRequestException('email and full_name are required');
        }
        
        // Tự động tạo mật khẩu tạm thời
        const temporaryPassword = Math.random().toString(36).slice(-8);
        
        // Gửi email với mật khẩu tạm thời
        try {
            await this.mailerService.sendMail({
                to: registerDto.email,
                subject: 'Chào mừng bạn đến với Beauty Shop - Mật khẩu tạm thời',
                html: `
                    <h2>Chào mừng ${registerDto.full_name}!</h2>
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
            registerDto.email,
            registerDto.full_name,
            registerDto.phone ?? '',
            temporaryPassword
        );
        
        if (result.success) {
            return {
                success: true,
                message: 'Đăng ký thành công! Mật khẩu tạm thời đã được gửi đến email của bạn.',
                email: registerDto.email, // Trả về email để mobile app có thể sử dụng
            };
        }
        
        return result;
    }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful. Returns access token and user info.' })
  @ApiResponse({ status: 400, description: 'Bad request - Email and password are required' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    if (!loginDto || !loginDto.email || !loginDto.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset - sends new password to email' })
  @ApiResponse({ status: 200, description: 'New password sent to email successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Email is required' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    if (!forgotPasswordDto || !forgotPasswordDto.email) {
      throw new BadRequestException('email is required');
    }
    const user = this.authService.existuser(forgotPasswordDto.email);
    if (!user) {
      return { success: false, message: 'Email không tồn tại' };
    }
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    try {
      await this.mailerService.sendMail({
        to: `${forgotPasswordDto.email}`,
        subject: 'Quên mật khẩu',
        text: `Mật khẩu mới của bạn là: ${newPassword}`,
        html: `Mật khẩu mới của bạn là: ${newPassword}`,
      });
    } catch (error) {
      return { success: false, message: 'Email không tồn tại' };
    }
    await this.authService.changepassword_forgotpassword(
      forgotPasswordDto.email,
      hashedPassword,
    );

    return {
      success: true,
      message: 'Mật khẩu mới đã được gửi đến email của bạn',
    };
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - userid, currentPassword, and newPassword are required' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Current password is incorrect' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    if (!changePasswordDto || !changePasswordDto.userid || !changePasswordDto.currentPassword || !changePasswordDto.newPassword) {
      throw new BadRequestException(
        'userid, currentPassword, and newPassword are required',
      );
    }
    return this.authService.changepassword(
      changePasswordDto.userid,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

    @Post('change-password-first-time')
    @ApiOperation({ summary: 'Change password on first login with temporary password' })
    @ApiResponse({ status: 200, description: 'Password changed successfully. Returns access token and auto-login.' })
    @ApiResponse({ status: 400, description: 'Bad request - email, temporaryPassword, and newPassword are required' })
    @ApiResponse({ status: 401, description: 'Unauthorized - Temporary password is incorrect' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async changePasswordFirstTime(@Body() changePasswordFirstTimeDto: ChangePasswordFirstTimeDto) {
        if (!changePasswordFirstTimeDto || !changePasswordFirstTimeDto.email || !changePasswordFirstTimeDto.temporaryPassword || !changePasswordFirstTimeDto.newPassword) {
            throw new BadRequestException('email, temporaryPassword, and newPassword are required');
        }
        
        // Xác thực mật khẩu tạm thời
        const loginResult = await this.authService.login(changePasswordFirstTimeDto.email, changePasswordFirstTimeDto.temporaryPassword);
        
        if (!loginResult.success) {
            return { success: false, message: 'Mật khẩu tạm thời không đúng' };
        }
        
        // Lấy user từ email
        const user = await this.authService.getUserByEmail(changePasswordFirstTimeDto.email);
        if (!user) {
            return { success: false, message: 'Người dùng không tồn tại' };
        }
        
        // Đổi mật khẩu và set firstlogin = false
        const result = await this.authService.changePasswordFirstTime(user.id, changePasswordFirstTimeDto.newPassword);
        
        if (result.success) {
            // Tạo JWT token để tự động đăng nhập
            const payload = { sub: user.id, email: user.email };
            const accessToken = await this.jwtService.signAsync(payload);
            
            return {
                success: true,
                message: 'Đổi mật khẩu thành công',
                access_token: accessToken, // ✅ Nhất quán với login endpoint (snake_case)
                requiresPasswordChange: false,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    avatar_url: user.avatar_url,
                    phone: user.phone,
                    firstlogin: false,
                },
            };
        }
        
        return result;
    }
    

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Google OAuth consent screen' })
  @ApiExcludeEndpoint() // Exclude from Swagger UI as it's a redirect endpoint
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // chuyển hướng sang Google OAuth
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback - handles Google authentication response' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with access token or error' })
  @ApiExcludeEndpoint() // Exclude from Swagger UI as it's a callback endpoint
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
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirects to Facebook OAuth consent screen' })
  @ApiExcludeEndpoint() // Exclude from Swagger UI as it's a redirect endpoint
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() {}

  @Get('facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback - handles Facebook authentication response' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with access token or error' })
  @ApiExcludeEndpoint() // Exclude from Swagger UI as it's a callback endpoint
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
