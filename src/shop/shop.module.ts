import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DeliveryModule } from 'src/delivery/delivery.module';

@Module({
  imports: [PrismaModule, DeliveryModule],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
