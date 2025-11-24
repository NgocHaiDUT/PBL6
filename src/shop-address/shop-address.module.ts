import { Module } from '@nestjs/common';
import { ShopAddressController } from './shop-address.controller';
import { ShopAddressService } from './shop-address.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [PrismaModule, DeliveryModule],
  controllers: [ShopAddressController],
  providers: [ShopAddressService],
  exports: [ShopAddressService],
})
export class ShopAddressModule {}
