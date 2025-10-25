import { Module } from '@nestjs/common';
import { DataInitService } from './data-init.service';
import { DataInitController } from './data-init.controller';
import { S3UploadService } from './s3-upload.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DataInitController],
  providers: [DataInitService, S3UploadService],
  exports: [S3UploadService]
})
export class DataInitModule {}
