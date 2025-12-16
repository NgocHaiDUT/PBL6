import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import ERROR_CODE from '../constants/error_code';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user) {
    if (err || !user) {
      throw new UnauthorizedException({
        code: ERROR_CODE.ACCESS_TOKEN_INVALID,
      });
    }

    return user;
  }
}
