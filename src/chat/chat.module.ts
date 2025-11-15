import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatController } from './chat.controller';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [PrismaModule, MessagesModule],
  controllers: [ChatController],
  providers: [ChatGateway],
  exports: [ChatGateway], // Export to use in other modules if needed
})
export class ChatModule {}