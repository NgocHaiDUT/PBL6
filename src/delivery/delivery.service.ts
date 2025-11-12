import { Injectable } from '@nestjs/common';
import {
  CalculateFeeDto,
  CreateOrderDto,
  GetLeadtimeDto,
  GetServicesDto,
  UpdateOrderDto,
} from './dto/ghn-order.dto';
import { RegisterShopDto } from '../ghn/dto/register-shop.dto';

@Injectable()
export abstract class DeliveryService {
  abstract getProvinces(): Promise<any>;
  abstract getDistricts(province_id: number): Promise<any>;
  abstract getWards(district_id: number): Promise<any>;
  abstract registerShop(shopData: RegisterShopDto): Promise<any>;
  abstract getAvailableServices(data: GetServicesDto): Promise<any>;
  abstract calculateShippingFee(data: CalculateFeeDto): Promise<any>;
  abstract previewShippingOrder(data: CreateOrderDto): Promise<any>;
  abstract createShippingOrder(
    data: CreateOrderDto,
    shopId: number,
  ): Promise<any>;
  abstract getShippingOrderDetail(orderCode: string): Promise<any>;
  abstract getShippingOrderDetailByClientCode(
    clientOrderCode: string,
  ): Promise<any>;
  abstract cancelShippingOrder(
    orderCodes: string[],
    shopId: number,
  ): Promise<any>;
  abstract updateShippingOrder(
    orderCode: string,
    updateData: Partial<UpdateOrderDto>,
    shopId: number,
  ): Promise<any>;
  abstract returnShippingOrder(
    orderCodes: string[],
    shopId: number,
  ): Promise<any>;
  abstract getLeadtime(data: GetLeadtimeDto, shopId: number): Promise<any>;
  abstract getPrintToken(orderCodes: string[]): Promise<any>;
}

