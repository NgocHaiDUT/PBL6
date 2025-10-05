import { Module } from '@nestjs/common';
import { DataInitService } from './data-init.service';
import { PrismaModule } from 'src/prisma/prisma.module';
@Module({
  imports : [PrismaModule],
  providers: [DataInitService]
})
export class DataInitModule {}
