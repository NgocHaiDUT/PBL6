import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-google-oauth20';
import { PrismaService } from '../prisma/prisma.service';
import { auth_provider } from '@prisma/client';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private prisma: PrismaService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_WEB_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_WEB_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const provider = auth_provider.google;
    const providerUserId = profile.id as string;
    const rawEmail = profile.emails?.[0]?.value as string | undefined;
    const email = rawEmail ?? `google_${providerUserId}@example.local`;
    const fullName = (profile.displayName as string) ?? null;
    const avatarUrl = (profile.photos?.[0]?.value as string) ?? null;

    // 1) Check existing identity by provider/id
    let identity = await this.prisma.auth_identities.findUnique({
      where: {
        provider_provider_user_id: {
          provider,
          provider_user_id: providerUserId,
        },
      },
      include: { user: true },
    });

    if (identity) {
      // Update tokens opportunistically
      await this.prisma.auth_identities.update({
        where: { id: identity.id },
        data: { access_token: accessToken, refresh_token: refreshToken },
      });
      return identity.user;
    }

    // 2) If not found, try to link to existing user by email
    let user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      // Get default role and its permissions
      const defaultRole = await this.prisma.role.findUnique({
        where: { name: 'user' },
        include: {
          rolePermissions: {
            select: {
              permission_id: true
            }
          }
        }
      });

      // Create user if not exists
      user = await this.prisma.users.create({
        data: {
          email,
          full_name: fullName ?? undefined,
          avatar_url: avatarUrl ?? undefined,
          role_id: defaultRole?.id,
        },
      });

      // Assign default permissions to new user
      if (defaultRole?.rolePermissions && defaultRole.rolePermissions.length > 0) {
        const userPermissionsData = defaultRole.rolePermissions.map(rp => ({
          user_id: user!.id,
          permission_id: rp.permission_id
        }));

        await this.prisma.userpermission.createMany({
          data: userPermissionsData
        });
      }
    }

    // 3) Create identity for this provider
    identity = await this.prisma.auth_identities.create({
      data: {
        user_id: user!.id,
        provider,
        provider_user_id: providerUserId,
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      include: { user: true },
    });

    return identity.user;
  }
}
