import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) { }

  async getCart(userId: number) {
    try {
      // Get or create cart for user
      let cart = await this.prisma.carts.findUnique({
        where: { user_id: userId },
        include: {
          cart_items: {
            include: {
              product: {
                include: {
                  brand: true,
                  shop: true, // Include shop info
                  product_media: {
                    orderBy: { sort_order: 'asc' },
                    take: 1,
                  },
                  product_variants: true,
                },
              },
              variant: true,
            },
          },
        },
      });

      // Create cart if doesn't exist
      if (!cart) {
        cart = await this.prisma.carts.create({
          data: {
            user_id: userId,
          },
          include: {
            cart_items: {
              include: {
                product: {
                  include: {
                    brand: true,
                    shop: true, // Include shop info
                    product_media: {
                      orderBy: { sort_order: 'asc' },
                      take: 1,
                    },
                    product_variants: true,
                  },
                },
                variant: true,
              },
            },
          },
        });
      }

      return {
        success: true,
        cart,
      };
    } catch (error) {
      console.error('Error fetching cart:', error);
      return {
        success: false,
        message: 'Lỗi khi tải giỏ hàng',
        error: error.message,
      };
    }
  }

  async addToCart(
    userId: number,
    data: { product_id: number; variant_id?: number; quantity: number }
  ) {
    try {
      // Validate product exists
      const product = await this.prisma.products.findUnique({
        where: { id: data.product_id },
        include: {
          product_variants: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Sản phẩm không tồn tại');
      }

      // Get or create cart
      let cart = await this.prisma.carts.findUnique({
        where: { user_id: userId },
      });

      if (!cart) {
        cart = await this.prisma.carts.create({
          data: { user_id: userId },
        });
      }

      // Determine variant and price
      let variantId = data.variant_id;
      let price: any;

      if (variantId) {
        const variant = product.product_variants.find((v) => v.id === variantId);
        if (!variant) {
          throw new BadRequestException('Biến thể không tồn tại');
        }
        price = variant.price;
      } else {
        // Use first variant if no variant specified
        if (product.product_variants.length > 0) {
          variantId = product.product_variants[0].id;
          price = product.product_variants[0].price;
        } else {
          throw new BadRequestException('Sản phẩm không có biến thể');
        }
      }

      // Check if item already exists in cart
      const existingItem = await this.prisma.cart_items.findFirst({
        where: {
          cart_id: cart.id,
          product_id: data.product_id,
          variant_id: variantId,
        },
      });

      let cartItem;

      if (existingItem) {
        // Update quantity
        cartItem = await this.prisma.cart_items.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + data.quantity,
          },
          include: {
            product: {
              include: {
                brand: true,
                product_media: {
                  orderBy: { sort_order: 'asc' },
                  take: 1,
                },
                product_variants: true,
              },
            },
            variant: true,
          },
        });
      } else {
        // Create new cart item
        cartItem = await this.prisma.cart_items.create({
          data: {
            cart_id: cart.id,
            product_id: data.product_id,
            variant_id: variantId,
            quantity: data.quantity,
            price_snapshot: price,
          },
          include: {
            product: {
              include: {
                brand: true,
                product_media: {
                  orderBy: { sort_order: 'asc' },
                  take: 1,
                },
                product_variants: true,
              },
            },
            variant: true,
          },
        });
      }

      // Update cart timestamp
      await this.prisma.carts.update({
        where: { id: cart.id },
        data: { updated_at: new Date() },
      });

      return {
        success: true,
        message: 'Đã thêm vào giỏ hàng',
        cartItem,
      };
    } catch (error) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        message: error.message || 'Lỗi khi thêm vào giỏ hàng',
        error: error.message,
      };
    }
  }

  async updateCartItem(userId: number, itemId: number, quantity: number) {
    try {
      // Verify item belongs to user's cart
      const cartItem = await this.prisma.cart_items.findUnique({
        where: { id: itemId },
        include: {
          cart: true,
        },
      });

      if (!cartItem || cartItem.cart.user_id !== userId) {
        throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
      }

      if (quantity <= 0) {
        throw new BadRequestException('Số lượng phải lớn hơn 0');
      }

      const updatedItem = await this.prisma.cart_items.update({
        where: { id: itemId },
        data: { quantity },
        include: {
          product: {
            include: {
              brand: true,
              product_media: {
                orderBy: { sort_order: 'asc' },
                take: 1,
              },
              product_variants: true,
            },
          },
          variant: true,
        },
      });

      // Update cart timestamp
      await this.prisma.carts.update({
        where: { id: cartItem.cart_id },
        data: { updated_at: new Date() },
      });

      return {
        success: true,
        message: 'Đã cập nhật giỏ hàng',
        cartItem: updatedItem,
      };
    } catch (error) {
      console.error('Error updating cart item:', error);
      return {
        success: false,
        message: error.message || 'Lỗi khi cập nhật giỏ hàng',
        error: error.message,
      };
    }
  }

  async removeFromCart(userId: number, itemId: number) {
    try {
      // Verify item belongs to user's cart
      const cartItem = await this.prisma.cart_items.findUnique({
        where: { id: itemId },
        include: {
          cart: true,
        },
      });

      if (!cartItem || cartItem.cart.user_id !== userId) {
        throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
      }

      await this.prisma.cart_items.delete({
        where: { id: itemId },
      });

      // Update cart timestamp
      await this.prisma.carts.update({
        where: { id: cartItem.cart_id },
        data: { updated_at: new Date() },
      });

      // Get updated cart
      const cart = await this.getCart(userId);

      return {
        success: true,
        message: 'Đã xóa khỏi giỏ hàng',
        cart: cart.cart,
      };
    } catch (error) {
      console.error('Error removing from cart:', error);
      return {
        success: false,
        message: error.message || 'Lỗi khi xóa khỏi giỏ hàng',
        error: error.message,
      };
    }
  }

  async clearCart(userId: number) {
    try {
      const cart = await this.prisma.carts.findUnique({
        where: { user_id: userId },
      });

      if (!cart) {
        throw new NotFoundException('Giỏ hàng không tồn tại');
      }

      await this.prisma.cart_items.deleteMany({
        where: { cart_id: cart.id },
      });

      // Update cart timestamp
      await this.prisma.carts.update({
        where: { id: cart.id },
        data: { updated_at: new Date() },
      });

      return {
        success: true,
        message: 'Đã xóa toàn bộ giỏ hàng',
        cart: {
          ...cart,
          cart_items: [],
        },
      };
    } catch (error) {
      console.error('Error clearing cart:', error);
      return {
        success: false,
        message: error.message || 'Lỗi khi xóa giỏ hàng',
        error: error.message,
      };
    }
  }
}
