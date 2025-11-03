import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-fallback-secret-key',
    });
  }

  async validate(payload: any) {
    // The payload is the decoded JWT. We can trust it because the signature has been verified.
    // The object returned here will be attached to the request object as `req.user`.
    return { userId: payload.sub, email: payload.email };
  }
}
