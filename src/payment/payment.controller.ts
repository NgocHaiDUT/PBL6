import { Controller, Get, Post, Query, Body, Res, Req, Logger } from '@nestjs/common';
import { type Response, type Request } from 'express';
import { PaymentFactory } from './payment.factory';
import { type VnpayReturnDto } from './dto/payment.dto';
import { ConfigService } from '@nestjs/config';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentFactory: PaymentFactory,
    private readonly configService: ConfigService,
  ) { }

  @Post('create-vnpay-url')
  async createVnpayUrl(
    @Body() body: { orderId: number },
    @Req() req: Request,
  ) {
    this.logger.log(`Creating VNPay URL for order: ${body.orderId}`);

    const paymentService = this.paymentFactory.getService('vnpay');

    // Get client IP address
    const ipAddr = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const paymentUrl = await paymentService.createPaymentUrl({
      orderId: body.orderId,
      amount: 0, // Will be fetched from order in the service
      orderInfo: `Thanh toan don hang #${body.orderId}`,
      ipAddr,
    });

    return {
      success: true,
      paymentUrl
    };
  }

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
