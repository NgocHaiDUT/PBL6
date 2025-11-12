import { Module } from '@nestjs/common';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GhnModule } from '../ghn/ghn.module';

@Module({
  imports: [PrismaModule, GhnModule],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}