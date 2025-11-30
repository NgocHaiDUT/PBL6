import { Controller, Get, Query, Res, Logger } from '@nestjs/common';
import { type Response } from 'express';
import { PaymentFactory } from './payment.factory';
import { type VnpayReturnDto } from './dto/payment.dto';
import { ConfigService } from '@nestjs/config';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentFactory: PaymentFactory,
    private readonly configService: ConfigService,
  ) {}

  @Get('vnpay-return')
  async vnpayReturn(@Query() query: VnpayReturnDto, @Res() res: Response) {
    this.logger.log(`VNPAY return received: ${JSON.stringify(query)}`);
    const paymentService = this.paymentFactory.getService('vnpay');
    const result = await paymentService.verifyReturn(query);

    if (result.isValid) {
      try {
        await paymentService.confirmReturnPayment(query);
      } catch (error) {
        this.logger.error(
          `Failed to update payment status from VNPAY return: ${error.message}`,
          error.stack,
        );
      }
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    if (result.isValid && result.isSuccess) {
      // Redirect to success page
      res.redirect(
        `${frontendUrl}/checkout/success?orderId=${result.orderId}&amount=${result.amount}`,
      );
    } else {
      // Redirect to failure page
      res.redirect(
        `${frontendUrl}/checkout/fail?orderId=${result.orderId}&message=${result.message}`,
      );
    }
  }

  @Get('vnpay-ipn')
  async vnpayIpn(@Query() query: VnpayReturnDto, @Res() res: Response) {
    this.logger.log(`VNPAY IPN received: ${JSON.stringify(query)}`);
    const paymentService = this.paymentFactory.getService('vnpay');
    const result = await paymentService.handleIpn(query);
    res.status(200).json(result);
  }
}
