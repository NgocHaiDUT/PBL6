import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MakeupService } from './makeup.service';
import { MakeupController } from './makeup.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [MakeupService],
  controllers: [MakeupController],
})
export class MakeupModule {}
