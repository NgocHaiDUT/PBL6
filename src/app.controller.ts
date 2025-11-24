import { Controller, Get, Query, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('users/search')
  async searchUsers(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return { data: [] };
    }

    const users = await this.prisma.users.findMany({
      where: {
        full_name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        full_name: true,
        avatar_url: true,
      },
      take: 10,
    });

    return { data: users };
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    const userId = parseInt(id);

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        avatar_url: true,
        created_at: true,
        is_active: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return { data: user };
  }
}
