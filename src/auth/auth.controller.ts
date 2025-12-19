import {
  Controller,
  Get,
  Req,
  UseGuards,
  Post,
  Body,
  BadRequestException,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
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
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CreateOAuthCodeDto } from './dto/create-oauth-code.dto';
import ERROR_CODE from './constants/error_code';
import { VerifyDeviceOtpDto } from './dto/verifed-email-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LogoutDto } from './dto/logout.dto';
import { RefreshAccessTokenDto } from './dto/refresh-access-token.dto';
import { ExchangeTokenDto } from './dto/exchange-token.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mailerService: MailerService,
    private jwtService: JwtService,
  ) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    if (
      !registerDto?.email ||
      !registerDto?.full_name ||
      !registerDto?.device_register
    ) {
      throw new BadRequestException('Missing value');
    }

    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access token and refresh token.',
    schema: {
      example: {
        success: true,
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Email and password are required',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    if (!loginDto || !loginDto.email || !loginDto.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.authService.login(loginDto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful for admin. Returns access and refresh tokens.',
    schema: {
      example: {
        success: true,
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials or not admin' })
  async adminLogin(@Body() loginDto: LoginDto) {
    if (!loginDto || !loginDto.email || !loginDto.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.authService.adminLogin(loginDto);
  }

  @Post('verify-device')
  async verifyDevice(@Body() dto: VerifyDeviceOtpDto) {
    return this.authService.verifyDevice(dto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset - sends new password to email',
  })
  @ApiResponse({
    status: 200,
    description: 'New password sent to email successfully',
  })
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
        subject: 'Đặt lại mật khẩu - Beauty Shop',
        html: `
        <h2>Xin chào!</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Beauty Shop của mình.</p>
        <p><strong>Mật khẩu mới của bạn là:</strong> ${newPassword}</p>
        <p>Vui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      `,
      });
    } catch (error) {
      return {
        success: false,
        message: 'Không thể gửi email. Vui lòng thử lại.',
      };
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
  @ApiResponse({
    status: 400,
    description:
      'Bad request - userid, currentPassword, and newPassword are required',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Current password is incorrect',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    if (
      !changePasswordDto ||
      !changePasswordDto.userid ||
      !changePasswordDto.currentPassword ||
      !changePasswordDto.newPassword
    ) {
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
  @ApiOperation({
    summary:
      'Change password on first login with temporary password',
  })
  @ApiResponse({
    status: 200,
    description:
      'Password changed successfully. Returns access token and auto-login.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - email, temporaryPassword, and newPassword are required',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Temporary password is incorrect',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePasswordFirstTime(
    @Body() changePasswordFirstTimeDto: ChangePasswordFirstTimeDto,
  ) {
    if (
      !changePasswordFirstTimeDto ||
      !changePasswordFirstTimeDto.email ||
      !changePasswordFirstTimeDto.temporaryPassword ||
      !changePasswordFirstTimeDto.newPassword
    ) {
      throw new BadRequestException(
        'email, temporaryPassword, and newPassword are required',
      );
    }

    // Xác thực mật khẩu tạm thời
    const user = await this.authService.validateUser(
      changePasswordFirstTimeDto.email,
      changePasswordFirstTimeDto.temporaryPassword,
    );

    // Đổi mật khẩu và set firstlogin = false
    const result = await this.authService.changePasswordFirstTime(
      user.id,
      changePasswordFirstTimeDto.newPassword,
    );

    return result;
  }

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  @ApiExcludeEndpoint()
  @UseGuards(GoogleAuthGuard)
  async googleLogin() { }

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth callback - handles Google authentication response',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with exchange code or access token',
  })
  @ApiResponse({
    status: 401,
    description:
      'Return UnauthorizedException, error code :GOOGLE_UNAUTHORIZED ',
  })
  @ApiExcludeEndpoint()
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req, @Res() res: Response) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException({
        code: ERROR_CODE.GOOGLE_UNAUTHORIZED,
      });
    }

    console.log('[GoogleCallback] User authenticated:', user.email);

    // Xử lý thông tin thiết bị từ state
    const state = req.query.state as string;
    let deviceType = 'mobile';
    let deviceId: string | undefined = undefined;

    if (state) {
      try {
        const decodedState = JSON.parse(
          Buffer.from(state, 'base64').toString(),
        );
        console.log('[GoogleCallback] Decoded state:', decodedState);
        deviceType = decodedState.device_type || 'mobile';
        deviceId = decodedState.device_id || undefined;
      } catch (error) {
        console.error('[GoogleCallback] Error parsing state:', error);
      }
    }

    // Tạo OAuth code với user_id và device_id (nếu có)
    const code = await this.authService.createOAuthCodeWithOptionalDevice(user.id, deviceId);

    console.log('[GoogleCallback] Created OAuth code:', code);

    const redirectBase = deviceType === 'web'
      ? (process.env.FRONTEND_URL)
      : process.env.MOBILE_URL;

    console.log(`[GoogleCallback] Redirecting to ${deviceType}: ${redirectBase}/auth/callback?code=${code}`);

    return res.redirect(`${redirectBase}/auth/callback?code=${code}`);
  }

  @Post('exchange')
  @ApiOperation({
    summary: 'Exchange OAuth code for access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens issued successfully',
    schema: {
      example: {
        success: true,
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @Get('facebook')
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Facebook OAuth consent screen',
  })
  @ApiExcludeEndpoint() // Exclude from Swagger UI as it's a redirect endpoint
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin() { }

  @Get('facebook/callback')
  @ApiOperation({
    summary:
      'Facebook OAuth callback - handles Facebook authentication response',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with access token or error',
  })
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
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async logout(@Body() dto: LogoutDto, @Req() req: any) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const userId = req.user.userId;

    return this.authService.logout(userId, dto.device_id!, dto.all ?? false);
  }
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New access token generated' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() dto: RefreshAccessTokenDto) {
    if (!dto.token || !dto.device_id) {
      throw new BadRequestException('Missing refresh_token or device_id');
    }

    return this.authService.refreshToken(dto);
  }

  @Post('exchange-token')
  @ApiOperation({
    summary: 'Exchange OAuth code for access token and refresh token',
  })
  @ApiResponse({ status: 200, description: 'Tokens generated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OAuth code' })
  async exchangeToken(@Body() dto: ExchangeTokenDto) {
    if (!dto.code || !dto.device_id) {
      throw new BadRequestException('Missing code or device_id');
    }

    return this.authService.exchangeToken(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Get information success' })
  @ApiResponse({ status: 401, description: 'Invalid access_token' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getCurentUser(@Req() req: any) {
    const userId = req.user.userId;

    const user = await this.authService.getCurrentUser(userId);


    return { success: true, user };
  }
}