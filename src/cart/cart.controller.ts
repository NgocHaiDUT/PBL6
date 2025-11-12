import { Controller, Get, Post, Patch, Delete, Body, Param, Request, Headers } from '@nestjs/common';
import { CartService } from '../cart/cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Headers('x-user-id') userId: string, @Request() req) {
    // Lấy userId từ header hoặc body (tương tự các controller khác)
    const finalUserId = userId || req.body?.user_id || req.headers['x-user-id'];
    
    if (!finalUserId) {
      return { success: false, error: 'User ID is required' };
    }
    
    return this.cartService.getCart(Number(finalUserId));
  }

  @Post('add')
  async addToCart(
    @Headers('x-user-id') userId: string,
    @Body() body: { product_id: number; variant_id?: number; quantity: number; user_id?: number }
  ) {
    // Lấy userId từ header hoặc body
    const finalUserId = userId || body.user_id;
    
    if (!finalUserId) {
      return { success: false, error: 'User ID is required' };
    }
    
    return this.cartService.addToCart(Number(finalUserId), body);
  }

  @Patch('item/:id')
  async updateCartItem(
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body() body: { quantity: number; user_id?: number }
  ) {
    // Lấy userId từ header hoặc body
    const finalUserId = userId || body.user_id;
    
    if (!finalUserId) {
      return { success: false, error: 'User ID is required' };
    }
    
    return this.cartService.updateCartItem(Number(finalUserId), Number(id), body.quantity);
  }

  @Delete('item/:id')
  async removeFromCart(
    @Headers('x-user-id') userId: string, 
    @Param('id') id: string,
    @Request() req
  ) {
    // Lấy userId từ header hoặc body
    const finalUserId = userId || req.body?.user_id;
    
    if (!finalUserId) {
      return { success: false, error: 'User ID is required' };
    }
    
    return this.cartService.removeFromCart(Number(finalUserId), Number(id));
  }

  @Delete('clear')
  async clearCart(@Headers('x-user-id') userId: string, @Request() req) {
    // Lấy userId từ header hoặc body
    const finalUserId = userId || req.body?.user_id;
    
    if (!finalUserId) {
      return { success: false, error: 'User ID is required' };
    }
    
    return this.cartService.clearCart(Number(finalUserId));
  }
}
