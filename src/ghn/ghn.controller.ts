import { Controller, Get, Query, Param, ParseIntPipe, BadRequestException, Post, Body, Patch } from '@nestjs/common';
import { GhnService } from './ghn.service';
import { GetDistrictsDto, GetWardsDto } from './dto/ghn.dto';
import {
  GetServicesDto,
  CalculateFeeDto,
  CreateOrderDto,
  CancelOrderDto,
  UpdateOrderDto,
  ReturnOrderDto,
  GetLeadtimeDto,
  GetPrintTokenDto,
} from './dto/ghn-order.dto';

@Controller('ghn')
export class GhnController {
  constructor(private readonly ghnService: GhnService) {}

  @Get('provinces')
  async getProvinces() {
    return this.ghnService.getProvinces();
  }

  @Get('districts')
  async getDistricts(@Query() query: GetDistrictsDto) {
    if (!query.province_id) {
      throw new BadRequestException('province_id is required');
    }
    return this.ghnService.getDistricts(query.province_id);
  }

  @Get('wards')
  async getWards(@Query() query: GetWardsDto) {
    if (!query.district_id) {
      throw new BadRequestException('district_id is required');
    }
    return this.ghnService.getWards(query.district_id);
  }

  @Get('services')
  async getAvailableServices(@Query() query: GetServicesDto) {
    if (!query.from_district_id || !query.to_district_id) {
      throw new BadRequestException('from_district_id and to_district_id are required');
    }
    return this.ghnService.getAvailableServices(query);
  }

  @Post('calculate-fee')
  async calculateShippingFee(@Body() body: CalculateFeeDto) {
    return this.ghnService.calculateShippingFee(body);
  }

  @Post('preview-order')
  async previewShippingOrder(@Body() body: CreateOrderDto) {
    return this.ghnService.previewShippingOrder(body);
  }

  @Post('create-order')
  async createShippingOrder(@Body() body: CreateOrderDto, @Query('shopId', ParseIntPipe) shopId: number) {
    if (!shopId) {
      throw new BadRequestException('shopId is required as a query parameter');
    }
    return this.ghnService.createShippingOrder(body, shopId);
  }

  @Get('order/:orderCode')
  async getShippingOrderDetail(@Param('orderCode') orderCode: string) {
    return this.ghnService.getShippingOrderDetail(orderCode);
  }

  @Get('order/client/:clientOrderCode')
  async getShippingOrderDetailByClientCode(@Param('clientOrderCode') clientOrderCode: string) {
    return this.ghnService.getShippingOrderDetailByClientCode(clientOrderCode);
  }

  @Post('cancel-order')
  async cancelShippingOrder(@Body() body: CancelOrderDto, @Query('shopId', ParseIntPipe) shopId: number) {
    if (!shopId) {
      throw new BadRequestException('shopId is required as a query parameter');
    }
    return this.ghnService.cancelShippingOrder(body.order_codes, shopId);
  }

  @Patch('update-order/:orderCode')
  async updateShippingOrder(@Param('orderCode') orderCode: string, @Body() body: UpdateOrderDto, @Query('shopId', ParseIntPipe) shopId: number) {
    if (!shopId) {
      throw new BadRequestException('shopId is required as a query parameter');
    }
    return this.ghnService.updateShippingOrder(orderCode, body, shopId);
  }

  @Post('return-order')
  async returnShippingOrder(@Body() body: ReturnOrderDto, @Query('shopId', ParseIntPipe) shopId: number) {
    if (!shopId) {
      throw new BadRequestException('shopId is required as a query parameter');
    }
    return this.ghnService.returnShippingOrder(body.order_codes, shopId);
  }

  @Post('leadtime')
  async getLeadtime(@Body() body: GetLeadtimeDto, @Query('shopId', ParseIntPipe) shopId: number) {
    if (!shopId) {
      throw new BadRequestException('shopId is required as a query parameter');
    }
    return this.ghnService.getLeadtime(body, shopId);
  }

  @Post('print-token')
  async getPrintToken(@Body() body: GetPrintTokenDto) {
    return this.ghnService.getPrintToken(body.order_codes);
  }
}
