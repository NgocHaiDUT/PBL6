import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, Profile } from 'passport-facebook';
import { PrismaService } from 'src/prisma/prisma.service';
import { auth_provider } from '@prisma/client';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private prisma: PrismaService) {
    super({
      clientID: process.env.FB_APP_ID!,
      clientSecret: process.env.FB_APP_SECRET!,
      callbackURL: process.env.FB_CALLBACK_URL || 'http://localhost:3000/auth/facebook/callback',
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'photos'],
      passReqToCallback: false,
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const provider = auth_provider.facebook;
    const providerUserId = profile.id;
    const rawEmail = profile.emails?.[0]?.value;
    const email = rawEmail ?? `facebook_${providerUserId}@example.local`;
    const fullName = `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim() || null;
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    // 1) Existing identity
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
      await this.prisma.auth_identities.update({
        where: { id: identity.id },
        data: { access_token: accessToken, refresh_token: refreshToken },
      });
      return identity.user;
    }

    // 2) Link or create user
    let user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.users.create({
        data: {
          email,
          full_name: fullName ?? undefined,
          avatar_url: avatarUrl ?? undefined,
        },
      });
    }

    // 3) Create identity
    identity = await this.prisma.auth_identities.create({
      data: {
        user_id: user.id,
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
