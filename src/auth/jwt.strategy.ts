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
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
      });
    }

    // Lấy permissions từ role
    const rolePermissions =
      user.role?.rolePermissions?.map((rp) => rp.permission.name) || [];
    // Lấy permissions trực tiếp từ user
    const userPermissions = user.userPermissions.map(
      (up) => up.permission.name,
    );
    // Merge và loại bỏ duplicate
    const allPermissions = [
      ...new Set([...rolePermissions, ...userPermissions]),
    ];

    console.log('🔍 [JWT Strategy] User ID:', user.id);
    console.log('🔍 [JWT Strategy] User role:', user.role?.name);
    console.log('🔍 [JWT Strategy] Role permissions:', rolePermissions);
    console.log('🔍 [JWT Strategy] User permissions:', userPermissions);
    console.log('🔍 [JWT Strategy] All permissions:', allPermissions);

    // The object returned here will be attached to the request object as `req.user`.
    return {
      userId: user.id,
      email: user.email,
      role: user.role?.name || user.role,
      permissions: allPermissions,
    };
  }
}
