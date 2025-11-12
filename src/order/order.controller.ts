import { Controller, Post, Get, Body, Param, Query, BadRequestException, Patch, ParseIntPipe } from '@nestjs/common';
import { OrderService } from './order.service';
import { CheckoutDto, QueryOrdersDto } from './dto/checkout.dto';
import { GetServicesDto, CalculateFeeDto, CreateOrderDto, GetLeadtimeDto } from '../ghn/dto/ghn-order.dto';

@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Post('create')
    async createOrder(
        @Body() body: CheckoutDto & { userId?: number }
    ) {
        if (!body.userId) {
            return { success: false, message: 'Vui lòng đăng nhập' };
        }

        if (!body.shipping_address_id) {
            throw new BadRequestException('Thiếu địa chỉ giao hàng');
        }

        return this.orderService.createOrderFromCart(
            body.userId,
            body.shipping_address_id,
            body.note,
            body.payment_method
        );
    }

    // Shipping Calculation Endpoints (Proxy to GhnService)
    @Post('shipping/services')
    async getAvailableServices(@Body() body: GetServicesDto) {
        return this.orderService.getAvailableServices(body);
    }

    @Post('shipping/calculate-fee')
    async calculateShippingFee(@Body() body: CalculateFeeDto) {
        return this.orderService.calculateShippingFee(body);
    }

    @Post('shipping/preview')
    async previewShippingOrder(@Body() body: CreateOrderDto) {
        return this.orderService.previewShippingOrder(body);
    }

    @Post('shipping/leadtime')
    async getLeadtime(@Body() body: GetLeadtimeDto, @Query('shopId', ParseIntPipe) shopId: number) {
        if (!shopId) {
            throw new BadRequestException('shopId is required as a query parameter');
        }
        return this.orderService.getLeadtime(body, shopId);
    }


    @Get('my-orders')
    async getMyOrders(
        @Query('userId') userId?: string,
        @Query() query?: QueryOrdersDto
    ) {
        if (!userId) {
            return { success: false, message: 'Vui lòng đăng nhập' };
        }

        return this.orderService.getMyOrders(Number(userId), query);
    }

    @Get(':id')
    async getOrderById(
        @Param('id') id: string,
        @Query('userId') userId?: string
    ) {
        return this.orderService.getOrderById(
            Number(id),
            userId ? Number(userId) : undefined
        );
    }

    @Post(':id/cancel')
    async cancelOrder(
        @Param('id') id: string,
        @Body() body: { userId?: number }
    ) {
        if (!body.userId) {
            return { success: false, message: 'Vui lòng đăng nhập' };
        }

        return this.orderService.cancelOrder(Number(id), body.userId);
    }

    // Seller/Staff APIs
    @Get('seller/orders')
    async getOrdersByShop(
        @Query('shopId') shopId?: string,
        @Query() query?: QueryOrdersDto
    ) {
        if (!shopId) {
            throw new BadRequestException('Thiếu shopId');
        }
        return this.orderService.getOrdersByShop(Number(shopId), query);
    }

    @Post('seller/orders/:id/status')
    async updateOrderStatus(
        @Param('id') id: string,
        @Body() body: { status: string }
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
    async adminRefundOrder(
        @Param('id') id: string
    ) {
        return this.orderService.adminRefundOrder(Number(id));
    }

    // GHN Order Management Endpoints
    @Get(':id/ghn/track')
    async trackGhnOrder(
        @Param('id') id: string,
        @Query('userId') userId?: string
    ) {
        return this.orderService.trackGhnOrder(Number(id), userId ? Number(userId) : undefined);
    }

    @Post(':id/ghn/cancel')
    async cancelGhnOrder(
        @Param('id') id: string,
        @Body() body: { userId?: number }
    ) {
        if (!body.userId) {
            return { success: false, message: 'Vui lòng đăng nhập' };
        }
        return this.orderService.cancelGhnOrder(Number(id), body.userId);
    }

    @Patch(':id/ghn/update')
    async updateGhnOrder(
        @Param('id') id: string,
        @Body() body: { userId?: number, updateData: any }
    ) {
        if (!body.userId) {
            return { success: false, message: 'Vui lòng đăng nhập' };
        }
        return this.orderService.updateGhnOrder(Number(id), body.userId, body.updateData);
    }

    @Post(':id/ghn/return')
    async returnGhnOrder(
        @Param('id') id: string,
        @Body() body: { userId?: number }
    ) {
        if (!body.userId) {
            return { success: false, message: 'Vui lòng đăng nhập' };
        }
        return this.orderService.returnGhnOrder(Number(id), body.userId);
    }
}

