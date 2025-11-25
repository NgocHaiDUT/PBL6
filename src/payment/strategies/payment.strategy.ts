import { CreatePaymentUrlDto, VnpayReturnDto } from '../dto/payment.dto';

export interface HandleIpnResponse {
  RspCode: string;
  Message: string;
}

export interface VerifyReturnResponse {
  isValid: boolean;
  orderId?: string;
  amount?: number;
  isSuccess: boolean;
  message: string;
}

export abstract class PaymentStrategy {
  abstract createPaymentUrl(
    createPaymentUrlDto: CreatePaymentUrlDto,
  ): Promise<string>;

  abstract handleIpn(data: VnpayReturnDto): Promise<HandleIpnResponse>;

  abstract verifyReturn(data: VnpayReturnDto): Promise<VerifyReturnResponse>;

  abstract confirmReturnPayment(data: VnpayReturnDto): Promise<void>;
}
