import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MakeupService } from './makeup.service';
import { MakeupController } from './makeup.controller';

@Module({
  imports: [HttpModule],
  providers: [MakeupService],
  controllers: [MakeupController],
})
export class MakeupModule {}
