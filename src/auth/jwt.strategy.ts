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
      secretOrKey: process.env.JWT_ACCESS_SECRET as string,
    });
  }

  async validate(payload: any) {
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

    // The object returned here will be attached to the request object as `req.user`.
    return {
      userId: user.id,
      email: user.email,
      role: user.role?.name || user.role,
      permissions: allPermissions,
    };
  }
}
