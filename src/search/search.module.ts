import { Module } from '@nestjs/common';
import { SearchController } from '../search/search.controller';
import { SearchService } from '../search/search.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
