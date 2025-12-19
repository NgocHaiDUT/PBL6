import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    const { device_id, device_type, state } = req.query;

    // If state is already provided (from web app), use it
    if (state) {
      console.log('🌐 [GoogleAuthGuard] Using state from web app:', state);
      return { state };
    }

    // Otherwise, create state from device params (for mobile)
    if (device_id || device_type) {
      const statePayload = {
        device_id,
        device_type,
      };

      const generatedState = Buffer.from(JSON.stringify(statePayload)).toString('base64');
      console.log('📱 [GoogleAuthGuard] Generated state for mobile:', generatedState);

      return { state: generatedState };
    }

    // No state and no device params - let it pass without state
    console.log('⚠️ [GoogleAuthGuard] No state or device params provided');
    return {};
  }
}
