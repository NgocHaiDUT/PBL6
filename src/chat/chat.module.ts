import { Module, forwardRef } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => MessagesModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    {
      provide: 'ChatGateway',
      useExisting: ChatGateway,
    },
  ],
  exports: [ChatGateway, 'ChatGateway'], // Export both for flexibility
})
export class ChatModule { }
