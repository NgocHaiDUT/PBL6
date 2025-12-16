import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    const { device_id, device_type } = req.query;

    const statePayload = {
      device_id,
      device_type,
    };

    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');

    return {
      state,
    };
  }
}
