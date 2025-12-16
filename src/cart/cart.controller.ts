import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('cart')
@UseGuards(JwtAuthGuard) // ✅ Require JWT authentication
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Request() req) {
    // ✅ Lấy userId từ JWT token
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    return this.cartService.getCart(Number(userId));
  }

  @Post('add')
  async addToCart(
    @Request() req,
    @Body() body: { product_id: number; variant_id?: number; quantity: number },
  ) {
    // ✅ Lấy userId từ JWT token
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    return this.cartService.addToCart(Number(userId), body);
  }

  @Patch('item/:id')
  async updateCartItem(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { quantity: number },
  ) {
    // ✅ Lấy userId từ JWT token
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    return this.cartService.updateCartItem(
      Number(userId),
      Number(id),
      body.quantity,
    );
  }

  @Delete('item/:id')
  async removeFromCart(@Request() req, @Param('id') id: string) {
    // ✅ Lấy userId từ JWT token
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    return this.cartService.removeFromCart(Number(userId), Number(id));
  }

  @Delete('clear')
  async clearCart(@Request() req) {
    // ✅ Lấy userId từ JWT token
    const userId = req.user?.sub || req.user?.userId;

    if (!userId) {
      return { success: false, error: 'User ID is required' };
    }

    return this.cartService.clearCart(Number(userId));
  }
}
