import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  BadRequestException,
  Patch,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CheckoutDto, QueryOrdersDto } from './dto/checkout.dto';
import {
  GetServicesDto,
  CalculateFeeDto,
  CreateOrderDto,
  GetLeadtimeDto,
} from '../delivery/dto/ghn-order.dto';
import { AuthGuard } from '@nestjs/passport';
import { CalculateCartShippingDto } from './dto/calculate-shipping.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('calculate-cart-shipping')
  @UseGuards(AuthGuard('jwt'))
  async calculateCartShipping(
    @Body() body: CalculateCartShippingDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('Items array cannot be empty.');
    }
    return this.orderService.calculateShippingForItems(userId, body);
  }

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  async createOrder(@Body() body: CheckoutDto, @Req() req: any) {
    const userId = req.user.userId;
    if (!body.shipping_address_id) {
      throw new BadRequestException('Thiếu địa chỉ giao hàng');
    }

    return this.orderService.createOrdersFromItems(
      userId,
      body.shipping_address_id,
      body.items,
      body.note,
      body.payment_method,
      req,
    );
  }

  // Shipping Calculation Endpoints (Proxy to GhnService)
  @Post('shipping/services')
  async getAvailableServices(@Body() body: GetServicesDto) {
    return this.orderService.getAvailableServices(body);
  }

  @Post('shipping/preview')
  async previewShippingOrder(@Body() body: CreateOrderDto) {
    return this.orderService.previewShippingOrder(body);
  }

  @Post('shipping/leadtime')
  async getLeadtime(
    @Body() body: GetLeadtimeDto,
    @Query('shopId', ParseIntPipe) shopId: number,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId is required as a query parameter');
    }
    return this.orderService.getLeadtime(body, shopId);
  }
  @Get('my-orders')
  @UseGuards(AuthGuard('jwt'))
  async getMyOrders(@Req() req: any, @Query() query?: QueryOrdersDto) {
    const userId = req.user.userId;
    return this.orderService.getMyOrders(userId, query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async getOrderById(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.orderService.getOrderById(Number(id), userId);
  }

  @Post(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  async cancelOrder(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.orderService.cancelOrder(Number(id), userId);
  }

  // Seller/Staff APIs
  @Get('seller/orders')
  async getOrdersByShop(
    @Query('shopId') shopId?: string,
    @Query() query?: QueryOrdersDto,
  ) {
    if (!shopId) {
      throw new BadRequestException('Thiếu shopId');
    }
    return this.orderService.getOrdersByShop(Number(shopId), query);
  }

  @Post('seller/orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    if (!body?.status) {
      throw new BadRequestException('Thiếu status');
    }
    return this.orderService.updateOrderStatus(Number(id), body.status);
  }

  // Admin APIs
  @Get('admin/orders')
  async adminListOrders(@Query() query?: QueryOrdersDto) {
    return this.orderService.adminListOrders(query);
  }

  @Post('admin/orders/:id/refund')
  async adminRefundOrder(@Param('id') id: string) {
    return this.orderService.adminRefundOrder(Number(id));
  }

  // GHN Order Management Endpoints
  @Get(':id/ghn/track')
  @UseGuards(AuthGuard('jwt'))
  async trackGhnOrder(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.orderService.trackGhnOrder(Number(id), userId);
  }

  @Post(':id/ghn/cancel')
  @UseGuards(AuthGuard('jwt'))
  async cancelGhnOrder(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.orderService.cancelGhnOrder(Number(id), userId);
  }

  @Patch(':id/ghn/update')
  @UseGuards(AuthGuard('jwt'))
  async updateGhnOrder(
    @Param('id') id: string,
    @Body() updateData: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.orderService.updateGhnOrder(Number(id), userId, updateData);
  }

  @Post(':id/ghn/return')
  @UseGuards(AuthGuard('jwt'))
  async returnGhnOrder(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.orderService.returnGhnOrder(Number(id), userId);
  }
}
