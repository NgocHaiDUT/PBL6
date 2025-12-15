import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StoryController } from './story.controller';
import { StoryService } from './story.service';
import { StoryScheduler } from './story.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(), // Enable scheduling
    forwardRef(() => ChatModule), // Import ChatModule for ChatGateway
  ],
  controllers: [StoryController],
  providers: [StoryService, StoryScheduler],
  exports: [StoryService],
})
export class StoryModule {}
