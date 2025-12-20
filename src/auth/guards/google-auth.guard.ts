import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    const { device_id, device_type } = req.query;

    console.log('[GoogleAuthGuard] Query paramsreceived:', req.query);

    const statePayload = {
      device_id: device_id || null,
      device_type: device_type || 'mobile',
    };

    console.log('[GoogleAuthGuard] State payload created:', statePayload);

    const generatedState = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    console.log('📱 [GoogleAuthGuard] Generated state for mobile:', generatedState);

    return { state: generatedState };
  }
}
