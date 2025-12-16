import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, PrismaService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
