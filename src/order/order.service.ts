import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ProductVariant {
    id: number;
    name: string | null;
    product_id: number;
    sku: string;
    shade_hex: string | null;
    size_label: string | null;
    price: any;
    compare_at_price: any;
    stock: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

@Injectable()
export class OrderService {
    constructor(private prisma: PrismaService) {}

    async createOrderFromCart(userId: number, shippingAddressId: number, note?: string, paymentMethod?: string) {
        try {
            // Get user's cart
            const cart = await this.prisma.carts.findUnique({
                where: { user_id: userId },
                include: {
                    cart_items: {
                        include: {
                            product: {
                                include: {
                                    shop: true,
                                    product_variants: true,
                                }
                            },
                            variant: true
                        }
                    }
                }
            });

            if (!cart || cart.cart_items.length === 0) {
                return { success: false, message: 'Giỏ hàng trống' };
            }

            // Validate shipping address
            const address = await this.prisma.addresses.findFirst({
                where: {
                    id: shippingAddressId,
                    user_id: userId
                }
            });

            if (!address) {
                return { success: false, message: 'Địa chỉ giao hàng không hợp lệ' };
            }

            // Group cart items by shop_id
            const itemsByShop = cart.cart_items.reduce<Record<number, typeof cart.cart_items>>((acc, item) => {
                const shopId = item.product.shop_id;
                if (!acc[shopId]) {
                    acc[shopId] = [] as any;
                }
                acc[shopId].push(item);
                return acc;
            }, {} as any);

            // Create orders for each shop using transaction
            const createdOrders: any[] = [];
            
            for (const [shopId, items] of Object.entries(itemsByShop)) {
                const orderData = await this.prisma.$transaction(async (tx) => {
                    let subtotal = 0;
                    let orderItems: any[] = [];

                    // Calculate totals and prepare order items
                    for (const cartItem of items) {
                        const variant = cartItem.variant || cartItem.product.product_variants[0];
                        const quantity = cartItem.quantity;
                        const unitPrice = Number(variant?.price || 0);
                        const lineTotal = unitPrice * quantity;
                        
                        subtotal += lineTotal;

                        orderItems.push({
                            product_id: cartItem.product_id,
                            variant_id: cartItem.variant_id,
                            name_snapshot: cartItem.product.name,
                            variant_snapshot: variant?.name || '',
                            unit_price: unitPrice,
                            quantity: quantity,
                            line_total: lineTotal
                        });
                    }

                    // Calculate shipping fee (free if > 500k VND)
                    const shippingFee = subtotal >= 500000 ? 0 : 30000;
                    
                    // Calculate tax (10% VAT)
                    const tax = subtotal * 0.1;
                    
                    // Total amount
                    const totalAmount = subtotal + shippingFee + tax;

                    // Create order
                    const order = await tx.orders.create({
                        data: {
                            user_id: userId,
                            shop_id: Number(shopId),
                            shipping_address_id: shippingAddressId,
                            status: 'pending' as any,
                            payment_status: 'unpaid' as any,
                            subtotal_amount: subtotal,
                            discount_amount: 0,
                            shipping_fee: shippingFee,
                            total_amount: totalAmount,
                            note: note
                        }
                    });

                    // Create order items
                    for (const orderItem of orderItems) {
                        await tx.order_items.create({
                            data: {
                                order_id: order.id,
                                ...orderItem
                            }
                        });
                    }

                    // Create payment record
                    await tx.payments.create({
                        data: {
                            order_id: order.id,
                            provider: paymentMethod || 'cod',
                            amount: totalAmount,
                            status: 'unpaid' as any
                        }
                    });

                    // Create shipment record
                    await tx.shipments.create({
                        data: {
                            order_id: order.id,
                            status: 'pending',
                            address_snapshot: `${address.street}, ${address.ward}, ${address.district}, ${address.province}`
                        }
                    });

                    return order;
                });

                createdOrders.push(orderData);
            }

            // Clear cart after successful order creation
            await this.prisma.cart_items.deleteMany({
                where: {
                    cart_id: cart.id
                }
            });

            return {
                success: true,
                message: 'Đặt hàng thành công',
                orders: createdOrders
            };

        } catch (error) {
            console.error('Error creating order:', error);
            return { success: false, message: 'Lỗi khi tạo đơn hàng' };
        }
    }

    async getMyOrders(userId: number, query?: any) {
        try {
            const { page = 1, limit = 10, status } = query || {};
            const skip = (page - 1) * limit;

            const where: any = { user_id: userId };
            if (status) {
                where.status = status;
            }

            const [orders, total] = await Promise.all([
                this.prisma.orders.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        shop: true,
                        order_items: {
                            include: {
                                product: {
                                    include: {
                                        product_media: true
                                    }
                                },
                                variant: true
                            }
                        },
                        shipping_address: true,
                        payments: true,
                        shipments: true
                    },
                    orderBy: { created_at: 'desc' }
                }),
                this.prisma.orders.count({ where })
            ]);

            return {
                success: true,
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching orders:', error);
            return { success: false, message: 'Lỗi khi tải đơn hàng' };
        }
    }

    async getOrderById(orderId: number, userId?: number) {
        try {
            const where: any = { id: orderId };
            if (userId) {
                where.user_id = userId;
            }

            const order = await this.prisma.orders.findFirst({
                where,
                include: {
                    shop: true,
                    user: true,
                    order_items: {
                        include: {
                            product: {
                                include: {
                                    product_media: true,
                                    brand: true
                                }
                            },
                            variant: true
                        }
                    },
                    shipping_address: true,
                    payments: true,
                    shipments: true
                }
            });

            if (!order) {
                return { success: false, message: 'Không tìm thấy đơn hàng' };
            }

            return { success: true, order };
        } catch (error) {
            console.error('Error fetching order:', error);
            return { success: false, message: 'Lỗi khi tải đơn hàng' };
        }
    }

    async cancelOrder(orderId: number, userId: number) {
        try {
            const order = await this.prisma.orders.findFirst({
                where: {
                    id: orderId,
                    user_id: userId
                }
            });

            if (!order) {
                return { success: false, message: 'Không tìm thấy đơn hàng' };
            }

            if (order.status === 'shipped' || order.status === 'delivered') {
                return { success: false, message: 'Không thể hủy đơn hàng đã giao' };
            }

            await this.prisma.orders.update({
                where: { id: orderId },
                data: { status: 'cancelled' }
            });

            // Update payment status to refunded if paid
            if (order.payment_status === 'paid') {
                await this.prisma.payments.updateMany({
                    where: { order_id: orderId },
                    data: { status: 'refunded' }
                });
            }

            return { success: true, message: 'Đã hủy đơn hàng' };
        } catch (error) {
            console.error('Error cancelling order:', error);
            return { success: false, message: 'Lỗi khi hủy đơn hàng' };
        }
    }

    // Seller/Staff
    async getOrdersByShop(shopId: number, query?: any) {
        try {
            const { page = 1, limit = 10, status } = query || {};
            const skip = (page - 1) * limit;

            const where: any = { shop_id: shopId };
            if (status) where.status = status;

            const [orders, total] = await Promise.all([
                this.prisma.orders.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        user: true,
                        order_items: true,
                        payments: true,
                        shipments: true,
                    },
                    orderBy: { created_at: 'desc' }
                }),
                this.prisma.orders.count({ where })
            ]);

            return {
                success: true,
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching shop orders:', error);
            return { success: false, message: 'Lỗi khi tải đơn hàng của shop' };
        }
    }

    async updateOrderStatus(orderId: number, status: string) {
        try {
            const allowed = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
            if (!allowed.includes(status)) {
                return { success: false, message: 'Trạng thái không hợp lệ' };
            }

            await this.prisma.orders.update({
                where: { id: orderId },
                data: { status: status as any }
            });

            return { success: true, message: 'Cập nhật trạng thái đơn hàng thành công' };
        } catch (error) {
            console.error('Error updating order status:', error);
            return { success: false, message: 'Lỗi khi cập nhật trạng thái đơn hàng' };
        }
    }

    // Admin
    async adminListOrders(query?: any) {
        try {
            const { page = 1, limit = 10, status } = query || {};
            const skip = (page - 1) * limit;
            const where: any = {};
            if (status) where.status = status;

            const [orders, total] = await Promise.all([
                this.prisma.orders.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        user: true,
                        shop: true,
                        order_items: true,
                        payments: true,
                        shipments: true
                    },
                    orderBy: { created_at: 'desc' }
                }),
                this.prisma.orders.count({ where })
            ]);

            return {
                success: true,
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error fetching admin orders:', error);
            return { success: false, message: 'Lỗi khi tải đơn hàng (admin)' };
        }
    }

    async adminRefundOrder(orderId: number) {
        try {
            const order = await this.prisma.orders.findUnique({ where: { id: orderId } });
            if (!order) return { success: false, message: 'Không tìm thấy đơn hàng' };

            await this.prisma.orders.update({ where: { id: orderId }, data: { status: 'refunded' } });
            await this.prisma.payments.updateMany({ where: { order_id: orderId }, data: { status: 'refunded' } });

            return { success: true, message: 'Đã hoàn tiền đơn hàng' };
        } catch (error) {
            console.error('Error refunding order:', error);
            return { success: false, message: 'Lỗi khi hoàn tiền đơn hàng' };
        }
    }

    // Create order directly from product (Buy Now functionality)
    async createOrderFromProduct(userId: number, productId: number, variantId: number | null, quantity: number, shippingAddressId: number, note?: string, paymentMethod?: string) {
        try {
            // Validate shipping address
            const address = await this.prisma.addresses.findFirst({
                where: {
                    id: shippingAddressId,
                    user_id: userId
                }
            });

            if (!address) {
                return { success: false, message: 'Địa chỉ giao hàng không hợp lệ' };
            }

            // Get product info
            const product = await this.prisma.products.findFirst({
                where: { id: productId },
                include: {
                    shop: true,
                    product_variants: true,
                    brand: true
                }
            });

            if (!product) {
                return { success: false, message: 'Sản phẩm không tồn tại' };
            }

            // Get variant or use default
            let variant: ProductVariant | null = null;
            if (variantId) {
                variant = await this.prisma.product_variants.findFirst({
                    where: { 
                        id: variantId,
                        product_id: productId
                    }
                }) as ProductVariant | null;
                if (!variant) {
                    return { success: false, message: 'Phiên bản sản phẩm không tồn tại' };
                }
            } else if (product.product_variants.length > 0) {
                variant = product.product_variants[0] as ProductVariant; // Use first variant as default
            }

            if (!variant) {
                return { success: false, message: 'Sản phẩm không có phiên bản hợp lệ' };
            }

            // Check stock
            if (variant.stock < quantity) {
                return { success: false, message: 'Không đủ hàng trong kho' };
            }

            // Calculate amounts
            const unitPrice = Number(variant.price);
            const subtotal = unitPrice * quantity;
            const shippingFee = subtotal >= 500000 ? 0 : 30000; // Free shipping for orders > 500k
            const tax = 0; // No tax for direct orders
            const totalAmount = subtotal + shippingFee + tax;

            // Create order using transaction
            const orderData = await this.prisma.$transaction(async (tx) => {
                // Create order
                const order = await tx.orders.create({
                    data: {
                        user_id: userId,
                        shop_id: product.shop_id,
                        shipping_address_id: shippingAddressId,
                        status: 'pending' as any,
                        payment_status: 'unpaid' as any,
                        subtotal_amount: subtotal,
                        discount_amount: 0,
                        shipping_fee: shippingFee,
                        total_amount: totalAmount,
                        note: note
                    }
                });

                // Create order item
                await tx.order_items.create({
                    data: {
                        order_id: order.id,
                        product_id: productId,
                        variant_id: variantId,
                        name_snapshot: product.name,
                        variant_snapshot: variant.name || '',
                        unit_price: unitPrice,
                        quantity: quantity,
                        line_total: subtotal
                    }
                });

                // Create payment record
                await tx.payments.create({
                    data: {
                        order_id: order.id,
                        provider: paymentMethod || 'cod',
                        amount: totalAmount,
                        status: 'unpaid' as any
                    }
                });

                // Create shipment record
                await tx.shipments.create({
                    data: {
                        order_id: order.id,
                        status: 'pending',
                        address_snapshot: `${address.street}, ${address.ward}, ${address.district}, ${address.province}`
                    }
                });

                // Update product variant stock
                await tx.product_variants.update({
                    where: { id: variant.id },
                    data: {
                        stock: variant.stock - quantity
                    }
                });

                return order;
            });

            return {
                success: true,
                message: 'Đặt hàng thành công',
                orders: [orderData]
            };

        } catch (error) {
            console.error('Error creating order from product:', error);
            return { success: false, message: 'Lỗi khi tạo đơn hàng' };
        }
    }
}

