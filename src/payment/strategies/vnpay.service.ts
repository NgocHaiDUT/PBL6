import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VnpayService as ThirdPartyVnpayService } from 'nestjs-vnpay';
import {
  PaymentStrategy,
  HandleIpnResponse,
  VerifyReturnResponse,
} from './payment.strategy';
import { CreatePaymentUrlDto, VnpayReturnDto } from '../dto/payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductCode } from 'vnpay';

@Injectable()
export class VnpayService implements PaymentStrategy {
  constructor(
    private readonly thirdPartyVnpayService: ThirdPartyVnpayService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async createPaymentUrl(
    createPaymentUrlDto: CreatePaymentUrlDto,
  ): Promise<string> {
    const { amount, orderInfo, orderId, ipAddr } = createPaymentUrlDto;

    const returnUrl =
      this.configService.get<string>('VNPAY_RETURN_URL') ||
      'http://localhost:3000/payment/vnpay-return';

    // Corrected method name
    const paymentUrl = this.thirdPartyVnpayService.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: ipAddr,
      vnp_TxnRef: orderId.toString(),
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: ProductCode.Health_Beauty, // Mã loại hàng hóa 'Sức khỏe - Làm đẹp' theo VNPAY
      vnp_ReturnUrl: returnUrl,
    });

    return paymentUrl;
  }

  async verifyReturn(data: VnpayReturnDto): Promise<VerifyReturnResponse> {
    // Corrected with await and extracting isSuccess from the returned object
    const verificationResult = await this.thirdPartyVnpayService.verifyReturnUrl(data);
    const isValid = verificationResult.isSuccess;

    return {
      isValid,
      orderId: data.vnp_TxnRef,
      amount: Number(data.vnp_Amount) / 100,
      isSuccess:
        isValid && data.vnp_ResponseCode === '00' && data.vnp_TransactionStatus === '00',
      message:
        isValid && data.vnp_ResponseCode === '00'
          ? 'Giao dịch thành công'
          : 'Giao dịch thất bại hoặc chữ ký không hợp lệ',
    };
  }

  async handleIpn(data: VnpayReturnDto): Promise<HandleIpnResponse> {
    // Corrected with await
    const isValid = await this.thirdPartyVnpayService.verifyIpnCall(data);

    if (!isValid) {
      return {
        RspCode: '97',
        Message: 'Invalid Checksum',
      };
    }

    const orderId = Number(data.vnp_TxnRef);
    const amount = Number(data.vnp_Amount) / 100;

    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return {
        RspCode: '01',
        Message: 'Order not found',
      };
    }

    // Corrected decimal comparison
    if (order.total_amount.toNumber() !== amount) {
      return {
        RspCode: '04',
        Message: 'Invalid amount',
      };
    }

    if (order.payment_status === 'paid') {
      return {
        RspCode: '02',
        Message: 'Order already confirmed',
      };
    }

    // Handle successful payment
    const isSuccess = this.isSuccessResponse(data);
    await this.persistPaymentStatus(order, data, isSuccess);

    return isSuccess
      ? {
          RspCode: '00',
          Message: 'Success',
        }
      : {
          RspCode: '99',
          Message: 'Payment failed',
        };
  }

  async confirmReturnPayment(data: VnpayReturnDto): Promise<void> {
    const orderId = Number(data.vnp_TxnRef);
    const amount = Number(data.vnp_Amount) / 100;

    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.total_amount.toNumber() !== amount) {
      throw new BadRequestException('Invalid amount');
    }

    if (order.payment_status === 'paid') {
      return;
    }

    await this.persistPaymentStatus(order, data, this.isSuccessResponse(data));
  }

  private isSuccessResponse(data: VnpayReturnDto): boolean {
    return (
      data.vnp_ResponseCode === '00' && data.vnp_TransactionStatus === '00'
    );
  }

  private async persistPaymentStatus(
    order: {
      id: number;
      payments: { id: number; status: string | null }[];
    },
    data: VnpayReturnDto,
    isSuccess: boolean,
  ): Promise<void> {
    const nextStatus = isSuccess ? 'paid' : 'failed';

    await this.prisma.orders.update({
      where: { id: order.id },
      data: { payment_status: nextStatus },
    });

    const payment = order.payments.find((p) =>
      ['pending', 'unpaid'].includes(p.status || ''),
    );

    if (payment) {
      await this.prisma.payments.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          transaction_id: data.vnp_TransactionNo,
          payload_raw: JSON.stringify(data),
        },
      });
    }
  }
}
