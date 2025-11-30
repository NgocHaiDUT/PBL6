import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RequirePasswordChangeGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Lấy user từ request (giả sử đã được authenticate)
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Kiểm tra firstlogin status
    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
      select: { firstlogin: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Nếu firstlogin = true, từ chối truy cập
    if (user.firstlogin) {
      throw new UnauthorizedException('Password change required');
    }

    return true;
  }
}
