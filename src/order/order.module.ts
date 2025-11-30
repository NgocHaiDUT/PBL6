import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { AddressModule } from '../address/address.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from 'src/payment/payment.module';
import { DeliveryModule } from 'src/delivery/delivery.module';

@Module({
  imports: [AddressModule, PrismaModule, DeliveryModule, PaymentModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
