import { Module } from '@nestjs/common';
import { ShopAddressController } from './shop-address.controller';
import { ShopAddressService } from './shop-address.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GhnModule } from '../ghn/ghn.module'; // Import GhnModule

@Module({
  imports: [PrismaModule, GhnModule], // Add GhnModule here
  controllers: [ShopAddressController],
  providers: [ShopAddressService],
  exports: [ShopAddressService],
})
export class ShopAddressModule {}