import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    console.log('🔐 [PermissionsGuard] Required permissions:', requiredPermissions);
    console.log('🔐 [PermissionsGuard] User:', user?.email, 'Role:', user?.role);
    console.log('🔐 [PermissionsGuard] User permissions:', user?.permissions);

    if (!user) {
      console.log('❌ [PermissionsGuard] No user found');
      throw new ForbiddenException('You do not have the necessary permissions.');
    }

    if (!user.permissions) {
      console.log('❌ [PermissionsGuard] User has no permissions array');
      throw new ForbiddenException('You do not have the necessary permissions.');
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    console.log('🔐 [PermissionsGuard] Has all permissions:', hasAllPermissions);

    if (hasAllPermissions) {
      console.log('✅ [PermissionsGuard] Access granted');
      return true;
    } else {
      console.log('❌ [PermissionsGuard] Access denied - missing permissions:', 
        requiredPermissions.filter(p => !user.permissions.includes(p)));
      throw new ForbiddenException(
        'You do not have the necessary permissions.',
      );
    }
  }
}
