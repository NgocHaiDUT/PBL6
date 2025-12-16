import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VnpayModule } from 'nestjs-vnpay';
import { PaymentController } from './payment.controller';
import { PaymentFactory } from './payment.factory';
import { VnpayService } from './strategies/vnpay.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    VnpayModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        vnpayHost:
          configService.get<string>('VNPAY_URL') ||
          'https://sandbox.vnpayment.vn',
        tmnCode: configService.get<string>('VNPAY_TMN_CODE') || 'DEFAULT_TMN_CODE',
        secureSecret: configService.get<string>('VNPAY_HASH_SECRET') || 'DEFAULT_HASH_SECRET',
        testMode: true, // Force test mode for sandbox
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PaymentController],
  providers: [VnpayService, PaymentFactory],
  exports: [PaymentFactory],
})
export class PaymentModule {}
