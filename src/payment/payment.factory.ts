import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStrategy } from './strategies/payment.strategy';
import { VnpayService } from './strategies/vnpay.service';

@Injectable()
export class PaymentFactory {
  constructor(private readonly vnpayService: VnpayService) {}

  getService(method: string): PaymentStrategy {
    switch (method.toLowerCase()) {
      case 'vnpay':
        return this.vnpayService;
      // In the future, you can add more cases
      // case 'momo':
      //   return this.momoService;
      default:
        throw new NotFoundException(
          `Payment method '${method}' is not supported.`,
        );
    }
  }
}
