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
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['email', 'profile'],
      passReqToCallback: true, // Enable to access request.query.state
    });

    console.log('🔗 [GoogleStrategy] Callback URL from env:', process.env.GOOGLE_CALLBACK_URL);
  }

  authorizationParams(): Record<string, string> {
    return {
      prompt: 'select_account',
    };
  }

  async validate(request: any, _accessToken: string, _refreshToken: string, profile: any) {
    const provider = auth_provider.google;
    const providerUserId = profile.id as string;
    const rawEmail = profile.emails?.[0]?.value as string | undefined;
    const email = rawEmail ?? `google_${providerUserId}@example.local`;
    const fullName = profile.displayName as string;
    const avatarUrl = profile.photos?.[0]?.value ?? null;

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
      return identity.user;
    }

    let user = await this.prisma.users.findUnique({ where: { email } });
    if (!user) {
      const defaultRole = await this.prisma.role.findUnique({
        where: { name: 'user' },
        include: {
          rolePermissions: {
            select: { permission_id: true },
          },
        },
      });

      user = await this.prisma.users.create({
        data: {
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          role_id: defaultRole?.id,
          firstlogin: false,
        },
      });

      if (defaultRole?.rolePermissions?.length) {
        await this.prisma.userpermission.createMany({
          data: defaultRole.rolePermissions.map((rp) => ({
            user_id: user!.id,
            permission_id: rp.permission_id,
          })),
        });
      }
    }

    identity = await this.prisma.auth_identities.create({
      data: {
        user_id: user.id,
        provider,
        provider_user_id: providerUserId,
      },
      include: { user: true },
    });

    // Parse state parameter to detect platform
    const state = request.query?.state as string;
    console.log('🔍 [GoogleStrategy] Raw state from query:', state);

    let platform = 'mobile'; // default

    if (state) {
      try {
        const decoded = Buffer.from(state, 'base64').toString();
        console.log('🔍 [GoogleStrategy] Decoded state:', decoded);
        const stateData = JSON.parse(decoded);
        console.log('🔍 [GoogleStrategy] Parsed state data:', stateData);
        platform = stateData.platform || 'mobile';
      } catch (e) {
        console.log('❌ [GoogleStrategy] Failed to parse state:', e.message);
      }
    } else {
      console.log('⚠️ [GoogleStrategy] No state parameter in query');
    }

    console.log('✅ [GoogleStrategy] Final platform:', platform);

    // Attach platform info to user object for controller to use
    return { ...identity.user, _platform: platform };
  }
}
