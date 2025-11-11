import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GhnService } from '../ghn/ghn.service';
import { CreateOrderDto, CreateOrderItemDto, UpdateOrderDto } from '../ghn/dto/ghn-order.dto';

@Injectable()
export class OrderService {
    constructor(
        private prisma: PrismaService,
        private ghnService: GhnService,
    ) {}

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

            // Validate shipping address and get GHN IDs
            const shippingAddress = await this.prisma.addresses.findFirst({
                where: {
                    id: shippingAddressId,
                    user_id: userId
                }
            });

            if (!shippingAddress || !shippingAddress.ghn_province_id || !shippingAddress.ghn_district_id || !shippingAddress.ghn_ward_code) {
                return { success: false, message: 'Địa chỉ giao hàng không hợp lệ hoặc thiếu thông tin GHN' };
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
                    
                    // Get shop details and default pickup address
                    const shop = await tx.shops.findUnique({
                        where: { id: Number(shopId) },
                        include: {
                            addresses: {
                                where: { is_default: true },
                                take: 1
                            }
                        }
                    });

                    if (!shop || !shop.addresses[0] || !shop.ghn_shop_id || !shop.addresses[0].ghn_district_id || !shop.addresses[0].ghn_ward_code) {
                        throw new BadRequestException(`Shop ${shop?.name || shopId} không có địa chỉ lấy hàng mặc định hoặc chưa đăng ký GHN.`);
                    }
                    const pickupAddress = shop.addresses[0];

                    // Calculate totals and prepare order items
                    const ghnItems: CreateOrderItemDto[] = [];
                    const productNames: string[] = [];

                    for (const cartItem of items) {
                        const variant = cartItem.variant || cartItem.product.product_variants[0];
                        const quantity = cartItem.quantity;
                        const unitPrice = Number(variant?.price || 0);
                        const lineTotal = unitPrice * quantity;
                        
                        subtotal += lineTotal;
                        productNames.push(`${cartItem.product.name} (${variant?.name || 'N/A'}) x${quantity}`);

                        orderItems.push({
                            product_id: cartItem.product_id,
                            variant_id: cartItem.variant_id,
                            name_snapshot: cartItem.product.name,
                            variant_snapshot: variant?.name || '',
                            unit_price: unitPrice,
                            quantity: quantity,
                            line_total: lineTotal
                        });

                        ghnItems.push({
                            name: cartItem.product.name,
                            code: variant?.sku || cartItem.product_id.toString(),
                            quantity: quantity,
                            price: Math.round(unitPrice),
                            length: variant?.length || 1, // Default to 1 if not set
                            width: variant?.width || 1,
                            height: variant?.height || 1,
                            weight: variant?.weight || 1,
                        });
                    }

                    // Calculate shipping fee using GHN API
                    let shippingFee = 0;
                    let expectedDeliveryTime: Date | undefined;
                    try {
                        // Prepare DTO for preview/fee calculation.
                        // Note: service_type_id will be forced to 5 in ghn.service
                        const ghnPreviewData: CreateOrderDto = {
                            payment_type_id: paymentMethod === 'cod' ? 2 : 1,
                            to_name: shippingAddress.recipient,
                            to_phone: shippingAddress.phone,
                            to_address: shippingAddress.street,
                            to_ward_name: shippingAddress.ward,
                            to_district_name: shippingAddress.district,
                            to_province_name: shippingAddress.province,
                            from_name: shop.name,
                            from_phone: shop.phone || pickupAddress.phone,
                            from_address: pickupAddress.street,
                            from_ward_name: pickupAddress.ward,
                            from_district_name: pickupAddress.district,
                            from_province_name: pickupAddress.province,
                            cod_amount: paymentMethod === 'cod' ? Math.round(subtotal) : 0,
                            insurance_value: Math.round(subtotal),
                            items: ghnItems,
                            service_type_id: 5, // Explicitly set for clarity, will be enforced by ghn.service
                            required_note: 'KHONGCHOXEMHANG',
                        };
                        const feeResponse = await this.ghnService.previewShippingOrder(ghnPreviewData);
                        shippingFee = feeResponse.total_fee;
                        expectedDeliveryTime = feeResponse.expected_delivery_time ? new Date(feeResponse.expected_delivery_time) : undefined;
                    } catch (ghnError) {
                        console.error('Error calculating GHN shipping fee:', ghnError);
                        // Fallback to a default shipping fee or throw error
                        shippingFee = 30000; // Default fee if GHN fails
                    }
                    
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
                            pickup_address_id: pickupAddress.id,
                            status: 'pending' as any,
                            payment_status: 'unpaid' as any,
                            subtotal_amount: subtotal,
                            discount_amount: 0,
                            shipping_fee: shippingFee,
                            total_amount: totalAmount,
                            note: note,
                            ghn_expected_delivery_time: expectedDeliveryTime,
                            shipping_payer: paymentMethod === 'cod' ? 'BUYER' : 'SELLER', // Example logic
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
                    const shipment = await tx.shipments.create({
                        data: {
                            order_id: order.id,
                            status: 'pending',
                            address_snapshot: `${shippingAddress.street}, ${shippingAddress.ward}, ${shippingAddress.district}, ${shippingAddress.province}`
                        }
                    });

                    // Create GHN shipping order
                    let ghnOrderCode: string | undefined;
                    try {
                        const ghnCreateOrderData: CreateOrderDto = {
                            payment_type_id: paymentMethod === 'cod' ? 2 : 1, // 1: Seller, 2: Buyer
                            note: note || '',
                            required_note: 'KHONGCHOXEMHANG', // Default, can be dynamic
                            
                            from_name: shop.name,
                            from_phone: shop.phone || pickupAddress.phone,
                            from_address: pickupAddress.street,
                            from_ward_name: pickupAddress.ward,
                            from_district_name: pickupAddress.district,
                            from_province_name: pickupAddress.province,

                            to_name: shippingAddress.recipient,
                            to_phone: shippingAddress.phone,
                            to_address: shippingAddress.street,
                            to_ward_name: shippingAddress.ward,
                            to_district_name: shippingAddress.district,
                            to_province_name: shippingAddress.province,

                            cod_amount: paymentMethod === 'cod' ? Math.round(totalAmount) : 0,
                            content: productNames.join(', ').substring(0, 2000), // Max 2000 chars
                            insurance_value: Math.round(subtotal),
                            items: ghnItems,
                            service_type_id: 5, // Explicitly set for clarity, will be enforced by ghn.service
                        };
                        const ghnOrderResponse = await this.ghnService.createShippingOrder(ghnCreateOrderData, shop.ghn_shop_id);
                        ghnOrderCode = ghnOrderResponse.order_code;

                        // Update order with GHN order code
                        await tx.orders.update({
                            where: { id: order.id },
                            data: { ghn_order_code: ghnOrderCode }
                        });
                        // Create initial shipment log
                        await tx.shipment_logs.create({
                            data: {
                                shipment_id: shipment.id,
                                status: 'GHN_CREATED',
                                location_description: 'Đơn hàng GHN đã được tạo',
                            }
                        });

                    } catch (ghnError) {
                        console.error('Error creating GHN shipping order:', ghnError);
                        // Handle GHN order creation failure, e.g., mark order as problematic
                        await tx.orders.update({
                            where: { id: order.id },
                            data: { status: 'processing', note: (order.note || '') + ' (Lỗi tạo đơn GHN)' }
                        });
                    }

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

    async trackGhnOrder(orderId: number, userId?: number) {
        try {
            const order = await this.prisma.orders.findFirst({
                where: { id: orderId, ...(userId && { user_id: userId }) },
                include: { shipments: true }
            });

            if (!order || !order.ghn_order_code) {
                return { success: false, message: 'Không tìm thấy đơn hàng GHN' };
            }

            const ghnDetail = await this.ghnService.getShippingOrderDetail(order.ghn_order_code);

            if (ghnDetail && order.shipments.length > 0) {
                const shipmentId = order.shipments[0].id;
                // Save new logs
                for (const log of ghnDetail.log) {
                    await this.prisma.shipment_logs.upsert({
                        where: {
                            shipment_id_status_updated_at: {
                                shipment_id: shipmentId,
                                status: log.status,
                                updated_at: new Date(log.updated_date),
                            },
                        },
                        update: {}, // No update needed if it exists
                        create: {
                            shipment_id: shipmentId,
                            status: log.status,
                            location_description: log.reason || log.description || '',
                            updated_at: new Date(log.updated_date),
                        },
                    });
                }
                // Update overall shipment status
                await this.prisma.shipments.update({
                    where: { id: shipmentId },
                    data: { status: ghnDetail.status.toLowerCase() }
                });
            }

            return { success: true, data: ghnDetail };
        } catch (error) {
            console.error('Error tracking GHN order:', error);
            return { success: false, message: 'Lỗi khi theo dõi đơn hàng GHN' };
        }
    }

    async cancelGhnOrder(orderId: number, userId: number) {
        try {
            const order = await this.prisma.orders.findFirst({
                where: { id: orderId, user_id: userId },
                include: { shop: true }
            });

            if (!order || !order.ghn_order_code || !order.shop?.ghn_shop_id) {
                return { success: false, message: 'Không tìm thấy đơn hàng GHN hoặc thông tin shop' };
            }

            const result = await this.ghnService.cancelShippingOrder([order.ghn_order_code], order.shop.ghn_shop_id);

            if (result && result[0]?.result) {
                await this.prisma.orders.update({
                    where: { id: orderId },
                    data: { status: 'cancelled' }
                });
                return { success: true, message: 'Đã hủy đơn hàng GHN thành công' };
            }
            return { success: false, message: 'Hủy đơn hàng GHN thất bại' };
        } catch (error) {
            console.error('Error cancelling GHN order:', error);
            return { success: false, message: 'Lỗi khi hủy đơn hàng GHN' };
        }
    }

    async updateGhnOrder(orderId: number, userId: number, updateData: Partial<UpdateOrderDto>) {
        try {
            const order = await this.prisma.orders.findFirst({
                where: { id: orderId, user_id: userId },
                include: { shop: true }
            });

            if (!order || !order.ghn_order_code || !order.shop?.ghn_shop_id) {
                return { success: false, message: 'Không tìm thấy đơn hàng GHN hoặc thông tin shop' };
            }

            // GHN API expects specific fields for update, map updateData to GHN format
            const ghnUpdatePayload: Partial<UpdateOrderDto> = {
                note: updateData.note,
                required_note: updateData.required_note,
                to_name: updateData.to_name,
                to_phone: updateData.to_phone,
                to_address: updateData.to_address,
                to_ward_name: updateData.to_ward_name,
                to_district_name: updateData.to_district_name,
                cod_amount: updateData.cod_amount,
                content: updateData.content,
                length: updateData.length,
                width: updateData.width,
                height: updateData.height,
                weight: updateData.weight,
                insurance_value: updateData.insurance_value,
                items: updateData.items,
            };

            const result = await this.ghnService.updateShippingOrder(order.ghn_order_code, ghnUpdatePayload, order.shop.ghn_shop_id);

            if (result) {
                return { success: true, message: 'Cập nhật đơn hàng GHN thành công' };
            }
            return { success: false, message: 'Cập nhật đơn hàng GHN thất bại' };
        } catch (error) {
            console.error('Error updating GHN order:', error);
            return { success: false, message: 'Lỗi khi cập nhật đơn hàng GHN' };
        }
    }

    async returnGhnOrder(orderId: number, userId: number) {
        try {
            const order = await this.prisma.orders.findFirst({
                where: { id: orderId, user_id: userId },
                include: { shop: true }
            });

            if (!order || !order.ghn_order_code || !order.shop?.ghn_shop_id) {
                return { success: false, message: 'Không tìm thấy đơn hàng GHN hoặc thông tin shop' };
            }

            const result = await this.ghnService.returnShippingOrder([order.ghn_order_code], order.shop.ghn_shop_id);

            if (result && result[0]?.result) {
                await this.prisma.orders.update({
                    where: { id: orderId },
                    data: { status: 'refunded' } // Or a specific 'returned' status
                });
                return { success: true, message: 'Yêu cầu trả hàng GHN thành công' };
            }
            return { success: false, message: 'Yêu cầu trả hàng GHN thất bại' };
        } catch (error) {
            console.error('Error returning GHN order:', error);
            return { success: false, message: 'Lỗi khi yêu cầu trả hàng GHN' };
        }
    }
}

