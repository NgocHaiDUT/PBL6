import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-fallback-secret-key',
    });
  }

  async validate(payload: any) {
    console.log('🔍 [JWT Strategy] Validating payload:', payload);
    
    const user = await this.prisma.users.findUnique({
      where: { id: Number(payload.sub) },
      include: {
        role_relation: true,
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    const permissions = user.userPermissions.map(
      (up) => up.permission.name,
    );

    console.log('🔍 [JWT Strategy] User ID:', user.id);
    console.log('🔍 [JWT Strategy] User permissions:', permissions);

    // The object returned here will be attached to the request object as `req.user`.
    return {
      userId: user.id,
      email: user.email,
      role: user.role_relation?.name || user.role,
      permissions: permissions,
    };
  }
}
