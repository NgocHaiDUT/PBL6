import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('You do not have the necessary permissions.');
    }

    // ✅ Tạm thời cho phép tất cả user role thực hiện mọi chức năng
    // Chỉ check permissions cho admin/seller
    if (user.role === 'user') {
      console.log(`✅ [PermissionsGuard] Bypassing permission check for user role: ${user.email}`);
      return true;
    }

    // Check permissions cho admin/seller/staff
    if (!user.permissions) {
      throw new ForbiddenException('You do not have the necessary permissions.');
    }

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (hasAllPermissions) {
        return true;
    } else {
        throw new ForbiddenException('You do not have the necessary permissions.');
    }
  }
}
