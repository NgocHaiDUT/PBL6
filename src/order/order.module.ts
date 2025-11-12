import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { AddressModule } from '../address/address.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GhnModule } from '../ghn/ghn.module';
import { DeliveryModule } from 'src/delivery/delivery.module';

@Module({
  imports: [AddressModule, PrismaModule, DeliveryModule],
  controllers: [OrderController],
  providers: [OrderService,],
  exports: [OrderService]
})
export class OrderModule {}
