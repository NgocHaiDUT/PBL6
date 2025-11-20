import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { FacebookStrategy } from './facebook.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-fallback-secret-key', // Use a strong secret in production
      signOptions: { expiresIn: '30d' }, // ✅ Token expires in 30 days (tăng từ 1d lên 30d)
    }),
  ],
  providers: [AuthService, GoogleStrategy, FacebookStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
