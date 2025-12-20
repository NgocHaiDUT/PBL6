import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationHelperService } from './notification-helper.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [PrismaModule, ChatModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationHelperService],
  exports: [NotificationsService, NotificationHelperService],
})
export class NotificationsModule { }
