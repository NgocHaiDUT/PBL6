import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DeliveryService } from './delivery.service';
import { GHNDeliveryService } from './ghn.delivery.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    {
      provide: DeliveryService,
      useClass: GHNDeliveryService,
    },
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}
