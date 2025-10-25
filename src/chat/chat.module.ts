import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ChatGateway],
  exports: [ChatGateway], // Export to use in other modules if needed
})
export class ChatModule {}