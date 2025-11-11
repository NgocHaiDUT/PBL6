import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { RegisterShopDto } from './dto/register-shop.dto';
import {
  GetServicesDto,
  CalculateFeeDto,
  CreateOrderDto,
  GetOrderDetailDto,
  CancelOrderDto,
  UpdateOrderDto,
  ReturnOrderDto,
  GetLeadtimeDto,
  GetPrintTokenDto,
} from './dto/ghn-order.dto';

@Injectable()
export class GhnService {
  private readonly token: string;
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const token = this.configService.get<string>('GHN_API_TOKEN');
    const apiUrl = this.configService.get<string>('GHN_API_URL');

    if (!token || !apiUrl) {
      throw new Error('GHN_API_TOKEN and GHN_API_URL must be configured in .env file');
    }

    this.token = token;
    this.apiUrl = apiUrl;
  }

  private async makeRequest(endpoint: string, method: 'get' | 'post' = 'get', data: any = {}, extraHeaders: any = {}) {
    const url = `${this.apiUrl}/${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Token': this.token,
      ...extraHeaders,
    };

    try {
      const response$ = method === 'get'
        ? this.httpService.get(url, { headers, params: data })
        : this.httpService.post(url, data, { headers });
        
      const response = await lastValueFrom(response$);
      
      if (response.data.code !== 200) {
        throw new HttpException(response.data.message || 'GHN API error', HttpStatus.BAD_GATEWAY);
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`GHN API request failed for ${url}:`, error.response?.data || error.message);
      throw new HttpException(error.response?.data?.message || 'Failed to communicate with GHN API', HttpStatus.BAD_GATEWAY);
    }
  }

  async getProvinces() {
    return this.makeRequest('master-data/province');
  }

  async getDistricts(province_id: number) {
    return this.makeRequest('master-data/district', 'get', { province_id });
  }

  async getWards(district_id: number) {
    return this.makeRequest('master-data/ward', 'get', { district_id });
  }

  async registerShop(shopData: RegisterShopDto) {
    return this.makeRequest('v2/shop/register', 'post', shopData);
  }

  async getAvailableServices(data: GetServicesDto) {
    return this.makeRequest('v2/shipping-order/available-services', 'post', data);
  }

  async calculateShippingFee(data: CalculateFeeDto) {
    // Enforce service_type_id to 5 (Heavy goods)
    data.service_type_id = 5;

    // Remove top-level dimensions as GHN will use item-level dimensions for service_type_id 5
    delete data.length;
    delete data.width;
    delete data.height;
    delete data.weight;

    // Validate items for Heavy goods
    if (!data.items || data.items.length === 0) {
      throw new HttpException('Items are required for Heavy goods service_type_id 5', HttpStatus.BAD_REQUEST);
    }
    for (const item of data.items) {
      if (!item.length || !item.width || !item.height || !item.weight) {
        throw new HttpException('Each item must have length, width, height, and weight for Heavy goods service_type_id 5', HttpStatus.BAD_REQUEST);
      }
    }
    return this.makeRequest('v2/shipping-order/fee', 'post', data);
  }

  async previewShippingOrder(data: CreateOrderDto) {
    // Enforce service_type_id to 5 (Heavy goods)
    data.service_type_id = 5;

    // Remove top-level dimensions as GHN will use item-level dimensions for service_type_id 5
    delete data.length;
    delete data.width;
    delete data.height;
    delete data.weight;

    // Validate items for Heavy goods
    if (!data.items || data.items.length === 0) {
      throw new HttpException('Items are required for Heavy goods service_type_id 5', HttpStatus.BAD_REQUEST);
    }
    for (const item of data.items) {
      if (!item.length || !item.width || !item.height || !item.weight) {
        throw new HttpException('Each item must have length, width, height, and weight for Heavy goods service_type_id 5', HttpStatus.BAD_REQUEST);
      }
    }
    return this.makeRequest('v2/shipping-order/preview', 'post', data);
  }

  async createShippingOrder(data: CreateOrderDto, shopId: number) {
    // Enforce service_type_id to 5 (Heavy goods)
    data.service_type_id = 5;

    // Remove top-level dimensions as GHN will use item-level dimensions for service_type_id 5
    delete data.length;
    delete data.width;
    delete data.height;
    delete data.weight;

    // Validate items for Heavy goods
    if (!data.items || data.items.length === 0) {
      throw new HttpException('Items are required for Heavy goods service_type_id 5', HttpStatus.BAD_REQUEST);
    }
    for (const item of data.items) {
      if (!item.length || !item.width || !item.height || !item.weight) {
        throw new HttpException('Each item must have length, width, height, and weight for Heavy goods service_type_id 5', HttpStatus.BAD_REQUEST);
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Token': this.token,
      'ShopId': shopId.toString(),
    };
    return this.makeRequest('v2/shipping-order/create', 'post', data, headers);
  }

  async getShippingOrderDetail(orderCode: string) {
    return this.makeRequest('v2/shipping-order/detail', 'post', { order_code: orderCode });
  }

  async getShippingOrderDetailByClientCode(clientOrderCode: string) {
    return this.makeRequest('v2/shipping-order/detail-by-client-code', 'post', { client_order_code: clientOrderCode });
  }

  async cancelShippingOrder(orderCodes: string[], shopId: number) {
    const headers = {
      'Content-Type': 'application/json',
      'Token': this.token,
      'ShopId': shopId.toString(),
    };
    return this.makeRequest('v2/switch-status/cancel', 'post', { order_codes: orderCodes }, headers);
  }

  async updateShippingOrder(orderCode: string, updateData: Partial<UpdateOrderDto>, shopId: number) {
    const headers = {
      'Content-Type': 'application/json',
      'Token': this.token,
      'ShopId': shopId.toString(),
    };
    return this.makeRequest('v2/shipping-order/update', 'post', { ...updateData, order_code: orderCode }, headers);
  }

  async returnShippingOrder(orderCodes: string[], shopId: number) {
    const headers = {
      'Content-Type': 'application/json',
      'Token': this.token,
      'ShopId': shopId.toString(),
    };
    return this.makeRequest('v2/switch-status/return', 'post', { order_codes: orderCodes }, headers);
  }

  async getLeadtime(data: GetLeadtimeDto, shopId: number) {
    const headers = {
      'Content-Type': 'application/json',
      'Token': this.token,
      'ShopId': shopId.toString(),
    };
    return this.makeRequest('v2/shipping-order/leadtime', 'post', data, headers);
  }

  async getPrintToken(orderCodes: string[]) {
    return this.makeRequest('v2/a5/gen-token', 'post', { order_codes: orderCodes });
  }
}
