import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { FacebookStrategy } from './facebook.strategy';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RequirePasswordChangeGuard } from './guards/require-password-change.guard';

@Module({
  imports: [PassportModule.register({ session: false }), PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, FacebookStrategy, RequirePasswordChangeGuard],
  exports: [RequirePasswordChangeGuard],
})
export class AuthModule {}