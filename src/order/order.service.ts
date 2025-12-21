import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOrderDto,
  CreateOrderItemDto,
  UpdateOrderDto,
  GetServicesDto,
  CalculateFeeDto,
  GetLeadtimeDto,
} from '../delivery/dto/ghn-order.dto';
import { DeliveryService } from '../delivery/delivery.service';
import { CalculateCartShippingDto } from './dto/calculate-shipping.dto';

import { PaymentFactory } from '../payment/payment.factory';
import { CreatePaymentUrlDto } from '../payment/dto/payment.dto';

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
  constructor(
    private prisma: PrismaService,
    private deliveryService: DeliveryService,
    private paymentFactory: PaymentFactory,
  ) { }

  async calculateShippingForItems(
    userId: number,
    dto: CalculateCartShippingDto,
  ) {
    const { items, shipping_address_id } = dto;

    // 1. Get User's Shipping Address
    let shippingAddress;
    if (shipping_address_id) {
      shippingAddress = await this.prisma.addresses.findFirst({
        where: { id: shipping_address_id, user_id: userId },
      });
      if (!shippingAddress) {
        throw new NotFoundException(
          'Shipping address not found or does not belong to user.',
        );
      }
    } else {
      shippingAddress = await this.prisma.addresses.findFirst({
        where: { user_id: userId, is_default: true },
      });
      if (!shippingAddress) {
        throw new NotFoundException('Default shipping address not found.');
      }
    }

    if (!shippingAddress.ghn_district_id || !shippingAddress.ghn_ward_code) {
      throw new BadRequestException(
        'Shipping address is missing GHN location details.',
      );
    }

    // 2. Fetch product details for all variants
    const variantIds = items.map((item) => item.variant_id);
    const variants = await this.prisma.product_variants.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            shop: {
              include: {
                addresses: {
                  where: { is_default: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // 3. Group items by shop
    const itemsByShop = new Map<number, any[]>();
    for (const item of items) {
      const variant = variantMap.get(item.variant_id);
      if (!variant) {
        throw new NotFoundException(
          `Variant with ID ${item.variant_id} not found.`,
        );
      }
      const shopId = variant.product.shop_id;
      if (!itemsByShop.has(shopId)) {
        itemsByShop.set(shopId, []);
      }
      itemsByShop.get(shopId)!.push({ ...variant, quantity: item.quantity });
    }

    // 4. Calculate shipping for each shop
    let totalShippingFee = 0;
    const shippingDetails: {
      shop_id: number;
      shop_name: string;
      fee: number;
      service_id: number;
    }[] = [];

    for (const [shopId, shopItems] of itemsByShop.entries()) {
      const firstItem = shopItems[0];
      const shop = firstItem.product.shop;

      if (!shop || !shop.addresses[0] || !shop.ghn_shop_id) {
        throw new BadRequestException(
          `Shop ${shop?.name || shopId} is not configured for shipping.`,
        );
      }
      const pickupAddress = shop.addresses[0];

      const ghnItems: CreateOrderItemDto[] = shopItems.map((item) => ({
        name: item.product.name,
        code: item.sku,
        quantity: item.quantity,
        price: Math.round(Number(item.price)),
        length: item.length,
        width: item.width,
        height: item.height,
        weight: item.weight,
      }));

      // --- Re-using the fee calculation logic ---
      const availableServices = await this.deliveryService.getAvailableServices(
        {
          from_district: pickupAddress.ghn_district_id!,
          to_district: shippingAddress.ghn_district_id!,
          shop_id: shop.ghn_shop_id,
        },
      );

      if (!availableServices || availableServices.length === 0) {
        throw new Error(
          `No available shipping services for shop ${shop.name}.`,
        );
      }

      const allItemsHaveDimensions = ghnItems.every(
        (item) => item.length && item.width && item.height && item.weight,
      );

      const feePromises = availableServices.map(async (service) => {
        if (service.service_type_id === 5 && !allItemsHaveDimensions) {
          return null;
        }
        try {
          const feeDto: CalculateFeeDto = {
            from_district_id: pickupAddress.ghn_district_id!,
            from_ward_code: pickupAddress.ghn_ward_code!,
            to_district_id: shippingAddress.ghn_district_id!,
            to_ward_code: shippingAddress.ghn_ward_code!,
            service_id: service.service_id,
            service_type_id: service.service_type_id,
            insurance_value: shopItems.reduce(
              (sum, item) => sum + Number(item.price) * item.quantity,
              0,
            ),
            cod_amount: 0, // Not relevant for fee calculation
            height: ghnItems.reduce(
              (sum, item) => sum + (item.height || 0) * item.quantity,
              0,
            ),
            length: Math.max(...ghnItems.map((item) => item.length || 0)),
            width: Math.max(...ghnItems.map((item) => item.width || 0)),
            weight: ghnItems.reduce(
              (sum, item) => sum + (item.weight || 0) * item.quantity,
              0,
            ),
            items: ghnItems,
          };
          const feeResponse =
            await this.deliveryService.calculateShippingFee(feeDto);
          return { service_id: service.service_id, fee: feeResponse.total };
        } catch (error) {
          return null;
        }
      });

      const feeResults = (await Promise.all(feePromises)).filter(
        (result): result is { service_id: number; fee: number } =>
          result !== null,
      );

      if (feeResults.length === 0) {
        throw new BadRequestException(
          `Could not calculate shipping fee for shop ${shop.name}. Products may be missing dimensions.`,
        );
      }

      const cheapestFee = feeResults.reduce((prev, curr) =>
        prev.fee < curr.fee ? prev : curr,
      );

      totalShippingFee += cheapestFee.fee;
      shippingDetails.push({
        shop_id: shopId,
        shop_name: shop.name,
        fee: cheapestFee.fee,
        service_id: cheapestFee.service_id,
      });
    }

    return {
      total_shipping_fee: totalShippingFee,
      details: shippingDetails,
    };
  }

  async createOrdersFromItems(
    userId: number,
    shippingAddressId: number,
    items: { variant_id: number; quantity: number }[],
    note?: string,
    paymentMethod?: string,
    req?: any,
  ) {
    try {
      if (!items || items.length === 0) {
        return { success: false, message: 'No items provided for checkout.' };
      }

      const normalizedPaymentMethod: 'cod' | 'vnpay' =
        paymentMethod && paymentMethod.toLowerCase() === 'vnpay'
          ? 'vnpay'
          : 'cod';

      // 1. Fetch all product/variant/shop details
      const variantIds = items.map((item) => item.variant_id);
      const variants = await this.prisma.product_variants.findMany({
        where: { id: { in: variantIds } },
        include: {
          product: {
            include: {
              shop: true,
              product_variants: true,
            },
          },
        },
      });

      const variantMap = new Map(variants.map((v) => [v.id, v]));
      const cartItems = items.map((item) => {
        const variant = variantMap.get(item.variant_id);
        if (!variant)
          throw new NotFoundException(
            `Variant with ID ${item.variant_id} not found.`,
          );
        return {
          ...item,
          product: variant.product,
          variant: variant,
        };
      });

      // 2. Validate shipping address
      const shippingAddress = await this.prisma.addresses.findFirst({
        where: { id: shippingAddressId, user_id: userId },
      });

      if (
        !shippingAddress ||
        !shippingAddress.ghn_province_id ||
        !shippingAddress.ghn_district_id ||
        !shippingAddress.ghn_ward_code
      ) {
        return {
          success: false,
          message: 'Địa chỉ giao hàng không hợp lệ hoặc thiếu thông tin GHN',
        };
      }

      // 3. Group items by shop
      const itemsByShop = cartItems.reduce<Record<number, typeof cartItems>>(
        (acc, item) => {
          const shopId = item.product.shop_id;
          if (!acc[shopId]) acc[shopId] = [];
          acc[shopId].push(item);
          return acc;
        },
        {},
      );

      const createdOrders: any[] = [];

      // Create orders per shop
      for (const [shopId, items] of Object.entries(itemsByShop)) {
        const newOrder = await this.prisma.$transaction(async (tx) => {
          let subtotal = 0;
          const orderItems: any[] = [];

          const shop = await tx.shops.findUnique({
            where: { id: Number(shopId) },
            include: {
              addresses: {
                where: { is_default: true },
                take: 1,
              },
            },
          });

          if (
            !shop ||
            !shop.addresses[0] ||
            !shop.ghn_shop_id ||
            !shop.addresses[0].ghn_district_id ||
            !shop.addresses[0].ghn_ward_code
          ) {
            throw new BadRequestException(
              `Shop ${shop?.name || shopId} không có địa chỉ lấy hàng mặc định hoặc chưa đăng ký GHN.`,
            );
          }

          const pickupAddress = shop.addresses[0];
          const ghnItems: CreateOrderItemDto[] = [];
          const productNames: string[] = [];

          for (const cartItem of items) {
            const variant =
              cartItem.variant || cartItem.product.product_variants[0];

            const quantity = cartItem.quantity;
            const unitPrice = Number(variant?.price || 0);
            const lineTotal = unitPrice * quantity;

            subtotal += lineTotal;
            productNames.push(
              `${cartItem.product.name} (${variant?.name || 'N/A'}) x${quantity}`,
            );

            orderItems.push({
              product_id: cartItem.product.id,
              variant_id: cartItem.variant_id,
              name_snapshot: cartItem.product.name,
              variant_snapshot: variant?.name || '',
              unit_price: unitPrice,
              quantity: quantity,
              line_total: lineTotal,
            });

            ghnItems.push({
              name: cartItem.product.name,
              code: variant?.sku || cartItem.product.id.toString(),
              quantity: quantity,
              price: Math.round(unitPrice),
              length: variant?.length ?? undefined,
              width: variant?.width ?? undefined,
              height: variant?.height ?? undefined,
              weight: variant?.weight ?? undefined,
            });
          }

          // Calculate shipping fee
          let shippingFee = 0;
          let expectedDeliveryTime: Date | undefined;
          let cheapestService: {
            service_id: number;
            service_type_id: number;
            fee: number;
          } | null = null;

          try {
            const availableServices =
              await this.deliveryService.getAvailableServices({
                from_district: pickupAddress.ghn_district_id!,
                to_district: shippingAddress.ghn_district_id!,
                shop_id: shop.ghn_shop_id,
              });

            if (!availableServices || availableServices.length === 0) {
              throw new Error('Không có dịch vụ vận chuyển nào từ GHN.');
            }

            const allItemsHaveDimensions = ghnItems.every(
              (item) => item.length && item.width && item.height && item.weight,
            );

            const feePromises = availableServices.map(async (service) => {
              if (service.service_type_id === 5 && !allItemsHaveDimensions) {
                return null;
              }

              try {
                const feeDto: CalculateFeeDto = {
                  from_district_id: pickupAddress.ghn_district_id!,
                  from_ward_code: pickupAddress.ghn_ward_code!,
                  to_district_id: shippingAddress.ghn_district_id!,
                  to_ward_code: shippingAddress.ghn_ward_code!,
                  service_id: service.service_id,
                  service_type_id: service.service_type_id,
                  insurance_value: Math.round(subtotal),
                  cod_amount:
                    normalizedPaymentMethod === 'cod'
                      ? Math.round(subtotal)
                      : 0,
                  height: ghnItems.reduce(
                    (sum, item) => sum + (item.height || 0) * item.quantity,
                    0,
                  ),
                  length: Math.max(...ghnItems.map((item) => item.length || 0)),
                  width: Math.max(...ghnItems.map((item) => item.width || 0)),
                  weight: ghnItems.reduce(
                    (sum, item) => sum + (item.weight || 0) * item.quantity,
                    0,
                  ),
                  items: ghnItems,
                };

                const feeResponse =
                  await this.deliveryService.calculateShippingFee(feeDto);

                return {
                  service_id: service.service_id,
                  service_type_id: service.service_type_id,
                  fee: feeResponse.total,
                };
              } catch {
                return null;
              }
            });

            const feeResults = (await Promise.all(feePromises)).filter(
              (r): r is { service_id: number; service_type_id: number; fee: number } =>
                r !== null,
            );

            if (feeResults.length === 0) {
              throw new Error(
                'Không thể tính phí vận chuyển cho dịch vụ nào.',
              );
            }

            cheapestService = feeResults.reduce((p, c) =>
              p.fee < c.fee ? p : c,
            );
            shippingFee = cheapestService.fee;

            // Leadtime
            const leadtimeResponse = await this.deliveryService.getLeadtime(
              {
                from_district_id: pickupAddress.ghn_district_id!,
                from_ward_code: pickupAddress.ghn_ward_code!,
                to_district_id: shippingAddress.ghn_district_id!,
                to_ward_code: shippingAddress.ghn_ward_code!,
                service_id: cheapestService.service_id,
              },
              shop.ghn_shop_id,
            );

            if (leadtimeResponse.leadtime) {
              expectedDeliveryTime = new Date(
                leadtimeResponse.leadtime * 1000,
              );
            }
          } catch (ghnError) {
            throw new BadRequestException(
              ghnError.message || 'Lỗi khi tính phí vận chuyển.',
            );
          }

          if (!cheapestService) {
            throw new BadRequestException(
              'Không tìm thấy dịch vụ vận chuyển phù hợp.',
            );
          }

          const totalAmount = subtotal + shippingFee;

          const order = await tx.orders.create({
            data: {
              user_id: userId,
              shop_id: Number(shopId),
              shipping_address_id: shippingAddressId,
              pickup_address_id: pickupAddress.id,
              status: 'pending',
              payment_status: 'unpaid',
              subtotal_amount: subtotal,
              discount_amount: 0,
              shipping_fee: shippingFee,
              total_amount: totalAmount,
              note: note,
              ghn_expected_delivery_time: expectedDeliveryTime,
              shipping_payer:
                normalizedPaymentMethod === 'cod' ? 'BUYER' : 'SELLER',
            },
          });

          for (const orderItem of orderItems) {
            await tx.order_items.create({
              data: {
                order_id: order.id,
                ...orderItem,
              },
            });
          }

          await tx.payments.create({
            data: {
              order_id: order.id,
              provider: normalizedPaymentMethod,
              amount: totalAmount,
              status: 'unpaid',
            },
          });

          const shipment = await tx.shipments.create({
            data: {
              order_id: order.id,
              status: 'pending',
              address_snapshot: `${shippingAddress.street}, ${shippingAddress.ward}, ${shippingAddress.district}, ${shippingAddress.province}`,
            },
          });

          return order;
        });

        const detailedOrder = await this.prisma.orders.findUnique({
          where: { id: newOrder.id },
          select: {
            id: true,
            shop_id: true,
            total_amount: true,
            ghn_order_code: true,
            order_items: {
              select: {
                quantity: true,
                variant: {
                  select: { id: true, name: true },
                },
                product: {
                  select: { name: true },
                },
              },
            },
          },
        });

        createdOrders.push(detailedOrder);
      }

      const cart = await this.prisma.carts.findUnique({
        where: { user_id: userId },
      });

      if (cart) {
        await this.prisma.cart_items.deleteMany({
          where: { cart_id: cart.id, variant_id: { in: variantIds } },
        });
      }

      let paymentUrl: string | null = null;
      if (normalizedPaymentMethod === 'vnpay') {
        if (createdOrders.length > 1) {
          throw new BadRequestException(
            'VNPAY checkout chỉ hỗ trợ một shop trong mỗi đơn.',
          );
        }

        if (createdOrders.length === 1) {
          const order = createdOrders[0];
          const paymentService = this.paymentFactory.getService('vnpay');
          const ipAddr =
            req.headers['x-forwarded-for'] || req.connection.remoteAddress;

          const paymentDto: CreatePaymentUrlDto = {
            orderId: order.id,
            amount: order.total_amount,
            orderInfo: `Thanh toan don hang ${order.id}`,
            ipAddr: ipAddr,
          };
          paymentUrl = await paymentService.createPaymentUrl(paymentDto);
        }
      }

      return {
        success: true,
        message: 'Đặt hàng thành công',
        orders: createdOrders,
        paymentUrl: paymentUrl,
      };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, message: 'Lỗi khi tạo đơn hàng' };
    }
  }
  async createOrderFromProduct(userId: number, productId: number, variantId: number | null, quantity: number, shippingAddressId: number, note?: string, paymentMethod?: string) {
    try {
      // Validate shipping address
      const address = await this.prisma.addresses.findFirst({
        where: {
          id: shippingAddressId,
          user_id: userId
        }
      });

      if (!address || !address.ghn_province_id || !address.ghn_district_id || !address.ghn_ward_code) {
        return { success: false, message: 'Địa chỉ giao hàng không hợp lệ hoặc thiếu thông tin GHN' };
      }

      // Get product info
      const product = await this.prisma.products.findFirst({
        where: { id: productId },
        include: {
          shop: {
            include: {
              addresses: {
                where: { is_default: true },
                take: 1
              }
            }
          },
          product_variants: true,
          brand: true
        }
      });

      if (!product) {
        return { success: false, message: 'Sản phẩm không tồn tại' };
      }

      const pickupAddress = product.shop.addresses[0];
      if (!pickupAddress || !pickupAddress.ghn_district_id || !pickupAddress.ghn_ward_code) {
        return { success: false, message: 'Shop chưa cấu hình địa chỉ lấy hàng hoặc thông tin GHN' };
      }

      // Get variant or use default
      let variant: any = null;
      if (variantId) {
        variant = await this.prisma.product_variants.findFirst({
          where: {
            id: variantId,
            product_id: productId
          }
        });
        if (!variant) {
          return { success: false, message: 'Phiên bản sản phẩm không tồn tại' };
        }
      } else if (product.product_variants.length > 0) {
        variant = product.product_variants[0];
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

      // For simplicity, keeping the existing shipping fee logic for Buy Now,
      // but you might want to call calculateShippingForItems instead.
      const shippingFee = subtotal >= 500000 ? 0 : 30000;
      const totalAmount = subtotal + shippingFee;

      // Create order using transaction
      const orderData = await this.prisma.$transaction(async (tx) => {
        // Create order
        const order = await tx.orders.create({
          data: {
            user_id: userId,
            shop_id: product.shop_id,
            shipping_address_id: shippingAddressId,
            pickup_address_id: pickupAddress.id,
            status: 'pending' as any,
            payment_status: 'unpaid' as any,
            subtotal_amount: subtotal,
            discount_amount: 0,
            shipping_fee: shippingFee,
            total_amount: totalAmount,
            note: note,
          }
        });

        // Create order item
        await tx.order_items.create({
          data: {
            order_id: order.id,
            product_id: productId,
            variant_id: variant.id,
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
          select: {
            id: true,
            status: true,
            payment_status: true,
            subtotal_amount: true,
            discount_amount: true,
            shipping_fee: true,
            total_amount: true,
            note: true,
            created_at: true,
            updated_at: true,
            shop: {
              select: {
                id: true,
                name: true,
                logo_url: true,
              },
            },
            order_items: {
              select: {
                id: true,
                name_snapshot: true,
                variant_snapshot: true,
                unit_price: true,
                quantity: true,
                line_total: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    product_media: {
                      take: 1,
                      orderBy: { id: 'asc' },
                      select: {
                        url: true,
                        type: true,
                      },
                    },
                  },
                },
                variant: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
            shipping_address: {
              select: {
                recipient: true,
                phone: true,
                province: true,
                district: true,
                ward: true,
                street: true,
              },
            },
            payments: {
              select: {
                id: true,
                provider: true,
                amount: true,
                status: true,
                created_at: true,
              },
            },
            shipments: {
              select: {
                id: true,
                status: true,
                carrier: true,
                tracking_number: true,
                shipped_at: true,
                delivered_at: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.orders.count({ where }),
      ]);

      return {
        success: true,
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
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
        select: {
          id: true,
          status: true,
          payment_status: true,
          subtotal_amount: true,
          discount_amount: true,
          shipping_fee: true,
          total_amount: true,
          note: true,
          created_at: true,
          updated_at: true,
          ghn_order_code: true,
          ghn_expected_delivery_time: true,
          shipping_payer: true,
          shop: {
            select: {
              id: true,
              name: true,
              logo_url: true,
              phone: true,
            },
          },
          user: {
            select: {
              id: true,
              full_name: true,
              phone: true,
              email: true,
            },
          },
          order_items: {
            select: {
              id: true,
              name_snapshot: true,
              variant_snapshot: true,
              unit_price: true,
              quantity: true,
              line_total: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  brand: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  product_media: {
                    take: 1,
                    orderBy: { id: 'asc' },
                    select: {
                      url: true,
                      type: true,
                    },
                  },
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  stock: true,
                },
              },
            },
          },
          shipping_address: {
            select: {
              recipient: true,
              phone: true,
              province: true,
              district: true,
              ward: true,
              street: true,
            },
          },
          payments: {
            select: {
              id: true,
              provider: true,
              amount: true,
              status: true,
              transaction_id: true,
              created_at: true,
            },
          },
          shipments: {
            select: {
              id: true,
              status: true,
              carrier: true,
              tracking_number: true,
              shipped_at: true,
              delivered_at: true,
              address_snapshot: true,
            },
          },
        },
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
          user_id: userId,
        },
      });

      if (!order) {
        return { success: false, message: 'Không tìm thấy đơn hàng' };
      }

      if (order.status === 'shipped' || order.status === 'delivered') {
        return { success: false, message: 'Không thể hủy đơn hàng đã giao' };
      }

      await this.prisma.orders.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
      });

      // Update payment status to refunded if paid
      if (order.payment_status === 'paid') {
        await this.prisma.payments.updateMany({
          where: { order_id: orderId },
          data: { status: 'refunded' },
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
          select: {
            id: true,
            status: true,
            payment_status: true,
            subtotal_amount: true,
            discount_amount: true,
            shipping_fee: true,
            total_amount: true,
            note: true,
            created_at: true,
            updated_at: true,
            user: {
              select: {
                id: true,
                full_name: true,
                phone: true,
                avatar_url: true,
              },
            },
            order_items: {
              select: {
                id: true,
                product_id: true,
                variant_id: true,
                name_snapshot: true,
                variant_snapshot: true,
                unit_price: true,
                quantity: true,
                line_total: true,
                variant: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    product: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                        product_media: {
                          take: 1,
                          orderBy: { id: 'asc' },
                          select: {
                            url: true,
                            type: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            payments: {
              select: {
                id: true,
                provider: true,
                amount: true,
                status: true,
                transaction_id: true,
                created_at: true,
              },
            },
            shipments: {
              select: {
                id: true,
                status: true,
                carrier: true,
                tracking_number: true,
                shipped_at: true,
                delivered_at: true,
              },
            },
            shipping_address: {
              select: {
                recipient: true,
                phone: true,
                province: true,
                district: true,
                ward: true,
                street: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.orders.count({ where }),
      ]);

      return {
        success: true,
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching shop orders:', error);
      return { success: false, message: 'Lỗi khi tải đơn hàng của shop' };
    }
  }

  async updateOrderStatus(orderId: number, status: string) {
    try {
      const allowed = [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded',
      ];
      if (!allowed.includes(status)) {
        return { success: false, message: 'Trạng thái không hợp lệ' };
      }

      if (status === 'confirmed') {
        await this.createGhnOrderForExistingOrder(orderId);
      }

      await this.prisma.orders.update({
        where: { id: orderId },
        data: { status: status as any },
      });

      return {
        success: true,
        message: 'Cập nhật trạng thái đơn hàng thành công',
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        message: error.message || 'Lỗi khi cập nhật trạng thái đơn hàng',
      };
    }
  }

  // Admin
  async adminListOrders(query?: any) {
    try {
      const { page = 1, limit = 10, status, shopId, userId, search } = query || {};
      const skip = (page - 1) * limit;
      const where: any = {};
      if (status) where.status = status;
      if (shopId) where.shop_id = Number(shopId);
      if (userId) where.user_id = Number(userId);

      // Add search functionality
      if (search) {
        const searchTerm = search.trim();
        const searchConditions: any[] = [];

        // Search by order ID if search term is a number
        const orderId = parseInt(searchTerm);
        if (!isNaN(orderId)) {
          searchConditions.push({ id: orderId });
        }

        // Search by customer name or email
        searchConditions.push({
          user: {
            OR: [
              { full_name: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        });

        where.OR = searchConditions;
      }

      const [orders, total] = await Promise.all([
        this.prisma.orders.findMany({
          where,
          skip,
          take: limit,
          select: {
            id: true,
            status: true,
            payment_status: true,
            subtotal_amount: true,
            discount_amount: true,
            shipping_fee: true,
            total_amount: true,
            created_at: true,
            updated_at: true,
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                phone: true,
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
                logo_url: true,
              },
            },
            order_items: {
              select: {
                id: true,
                name_snapshot: true,
                variant_snapshot: true,
                unit_price: true,
                quantity: true,
                line_total: true,
              },
            },
            payments: {
              select: {
                id: true,
                provider: true,
                amount: true,
                status: true,
                created_at: true,
              },
            },
            shipments: {
              select: {
                id: true,
                status: true,
                tracking_number: true,
                delivered_at: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.orders.count({ where }),
      ]);

      return {
        success: true,
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      return { success: false, message: 'Lỗi khi tải đơn hàng (admin)' };
    }
  }

  async adminRefundOrder(orderId: number) {
    try {
      const order = await this.prisma.orders.findUnique({
        where: { id: orderId },
      });
      if (!order) return { success: false, message: 'Không tìm thấy đơn hàng' };

      await this.prisma.orders.update({
        where: { id: orderId },
        data: { status: 'refunded' },
      });
      await this.prisma.payments.updateMany({
        where: { order_id: orderId },
        data: { status: 'refunded' },
      });

      return { success: true, message: 'Đã hoàn tiền đơn hàng' };
    } catch (error) {
      console.error('Error refunding order:', error);
      return { success: false, message: 'Lỗi khi hoàn tiền đơn hàng' };
    }
  }

  private async createGhnOrderForExistingOrder(orderId: number) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            product: true,
            variant: true,
          },
        },
        shipping_address: true,
        pickup_address: true,
        shop: true,
        shipments: { take: 1 },
        payments: { take: 1 },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.ghn_order_code) {
      return order.ghn_order_code;
    }

    const pickupAddress = order.pickup_address;
    const shippingAddress = order.shipping_address;
    const shop = order.shop;

    if (
      !pickupAddress ||
      !shippingAddress ||
      !shop ||
      !shop.ghn_shop_id ||
      !pickupAddress.ghn_district_id ||
      !pickupAddress.ghn_ward_code ||
      !shippingAddress.ghn_district_id ||
      !shippingAddress.ghn_ward_code
    ) {
      throw new BadRequestException(
        'Thiếu thông tin vận chuyển hoặc GHN của shop/người mua',
      );
    }

    const ghnItems: CreateOrderItemDto[] = order.order_items.map((item) => ({
      name: item.product.name,
      code: item.variant?.sku || item.product.id.toString(),
      quantity: item.quantity,
      price: Math.round(Number(item.unit_price)),
      length: item.variant?.length ?? undefined,
      width: item.variant?.width ?? undefined,
      height: item.variant?.height ?? undefined,
      weight: item.variant?.weight ?? undefined,
    }));

    const productNames = order.order_items.map(
      (item) =>
        `${item.product.name} (${item.variant?.name || 'N/A'}) x${item.quantity}`,
    );

    // Calculate shipping fee (re-calculate to get service_id)
    const availableServices = await this.deliveryService.getAvailableServices({
      from_district: pickupAddress.ghn_district_id!,
      to_district: shippingAddress.ghn_district_id!,
      shop_id: shop.ghn_shop_id,
    });

    if (!availableServices || availableServices.length === 0) {
      throw new BadRequestException('Không có dịch vụ vận chuyển nào từ GHN.');
    }

    const allItemsHaveDimensions = ghnItems.every(
      (item) => item.length && item.width && item.height && item.weight,
    );

    const feePromises = availableServices.map(async (service) => {
      if (service.service_type_id === 5 && !allItemsHaveDimensions) {
        return null;
      }
      try {
        const feeDto: CalculateFeeDto = {
          from_district_id: pickupAddress.ghn_district_id!,
          from_ward_code: pickupAddress.ghn_ward_code!,
          to_district_id: shippingAddress.ghn_district_id!,
          to_ward_code: shippingAddress.ghn_ward_code!,
          service_id: service.service_id,
          service_type_id: service.service_type_id,
          insurance_value: Math.round(Number(order.subtotal_amount)),
          cod_amount:
            order.payments[0]?.provider === 'cod'
              ? Math.round(Number(order.total_amount))
              : 0,
          height: ghnItems.reduce(
            (sum, item) => sum + (item.height || 0) * item.quantity,
            0,
          ),
          length: Math.max(...ghnItems.map((item) => item.length || 0)),
          width: Math.max(...ghnItems.map((item) => item.width || 0)),
          weight: ghnItems.reduce(
            (sum, item) => sum + (item.weight || 0) * item.quantity,
            0,
          ),
          items: ghnItems,
        };
        const feeResponse =
          await this.deliveryService.calculateShippingFee(feeDto);
        return {
          service_id: service.service_id,
          service_type_id: service.service_type_id,
          fee: feeResponse.total,
        };
      } catch {
        return null;
      }
    });

    const feeResults = (await Promise.all(feePromises)).filter(
      (r): r is any => r !== null,
    );
    if (feeResults.length === 0) {
      throw new BadRequestException('Không thể tính phí vận chuyển từ GHN.');
    }

    const cheapestService = feeResults.reduce((p, c) =>
      p.fee < c.fee ? p : c,
    );

    // Create GHN Order
    const provinces = await this.deliveryService.getProvinces();
    const toProvince = provinces.find(
      (p) => p.ProvinceID === shippingAddress.ghn_province_id,
    );
    const districts = await this.deliveryService.getDistricts(
      shippingAddress.ghn_province_id!,
    );
    const toDistrict = districts.find(
      (d) => d.DistrictID === shippingAddress.ghn_district_id,
    );
    const wards = await this.deliveryService.getWards(
      shippingAddress.ghn_district_id!,
    );
    const toWard = wards.find(
      (w) => w.WardCode === shippingAddress.ghn_ward_code,
    );

    const ghnCreateOrderData: CreateOrderDto = {
      from_district_id: pickupAddress.ghn_district_id!,
      to_district_id: shippingAddress.ghn_district_id!,
      payment_type_id: order.payments[0]?.provider === 'cod' ? 2 : 1,
      note: order.note || '',
      required_note: 'KHONGCHOXEMHANG',
      from_name: shop.name,
      from_phone: shop.phone || pickupAddress.phone,
      from_address: pickupAddress.street,
      from_ward_name: pickupAddress.ward,
      from_district_name: pickupAddress.district,
      from_province_name: pickupAddress.province,
      to_name: shippingAddress.recipient,
      to_phone: shippingAddress.phone,
      to_address: shippingAddress.street,
      to_ward_name: toWard?.WardName || shippingAddress.ward,
      to_district_name: toDistrict?.DistrictName || shippingAddress.district,
      to_province_name: toProvince?.ProvinceName || shippingAddress.province,
      cod_amount:
        order.payments[0]?.provider === 'cod'
          ? Math.round(Number(order.total_amount))
          : 0,
      content: productNames.join(', ').substring(0, 2000),
      insurance_value: Math.round(Number(order.subtotal_amount)),
      items: ghnItems,
      service_id: cheapestService.service_id,
      service_type_id: cheapestService.service_type_id,
      weight: ghnItems.reduce(
        (sum, item) => sum + (item.weight || 0) * item.quantity,
        0,
      ),
      length: Math.max(...ghnItems.map((i) => i.length || 0)),
      width: Math.max(...ghnItems.map((i) => i.width || 0)),
      height: ghnItems.reduce(
        (sum, item) => sum + (item.height || 0) * item.quantity,
        0,
      ),
    };

    const ghnOrderResponse = await this.deliveryService.createShippingOrder(
      ghnCreateOrderData,
      shop.ghn_shop_id,
    );

    const ghnOrderCode = ghnOrderResponse.order_code;
    const expectedDelivery = ghnOrderResponse.expected_delivery_time;

    await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        ghn_order_code: ghnOrderCode,
        ghn_expected_delivery_time: expectedDelivery ? new Date(expectedDelivery) : null,
      },
    });

    if (order.shipments[0]) {
      await this.prisma.shipments.update({
        where: { id: order.shipments[0].id },
        data: { tracking_number: ghnOrderCode, carrier: 'GHN' },
      });

      await this.prisma.shipment_logs.create({
        data: {
          shipment_id: order.shipments[0].id,
          status: 'GHN_CREATED',
          location_description: 'Đơn hàng GHN đã được tạo khi shop xác nhận',
        },
      });
    }

    return ghnOrderCode;
  }

  // Helper function to map GHN statuses to internal shipment_status enum
  private mapGhnStatusToShipmentStatus(ghnStatus: string): string {
    switch (ghnStatus.toLowerCase()) {
      case 'ready_to_pick':
      case 'picking':
      case 'storing':
        return 'pending'; // Or 'processing' if you have it
      case 'transporting':
      case 'shipping':
        return 'shipped';
      case 'delivered':
        return 'delivered';
      case 'cancel':
      case 'returned':
        return 'cancelled'; // Or 'returned' if you have a specific enum for it
      default:
        return 'pending'; // Default to pending or throw an error for unknown status
    }
  }

  async trackGhnOrder(orderId: number, userId?: number) {
    try {
      const order = await this.prisma.orders.findFirst({
        where: { id: orderId, ...(userId && { user_id: userId }) },
        include: { shipments: true },
      });

      if (!order || !order.ghn_order_code) {
        return { success: false, message: 'Không tìm thấy đơn hàng GHN' };
      }

      const ghnDetail = await this.deliveryService.getShippingOrderDetail(
        order.ghn_order_code,
      );

      if (ghnDetail && order.shipments.length > 0) {
        const shipmentId = order.shipments[0].id;
        // Save new logs if they exist
        if (ghnDetail.log && Array.isArray(ghnDetail.log)) {
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
        }
        // Update overall shipment status
        const mappedStatus = this.mapGhnStatusToShipmentStatus(
          ghnDetail.status,
        );
        await this.prisma.shipments.update({
          where: { id: shipmentId },
          data: { status: mappedStatus as any },
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
        include: { shop: true },
      });

      if (!order || !order.ghn_order_code || !order.shop?.ghn_shop_id) {
        return {
          success: false,
          message: 'Không tìm thấy đơn hàng GHN hoặc thông tin shop',
        };
      }

      const result = await this.deliveryService.cancelShippingOrder(
        [order.ghn_order_code],
        order.shop.ghn_shop_id,
      );

      if (result && result[0]?.result) {
        await this.prisma.orders.update({
          where: { id: orderId },
          data: { status: 'cancelled' },
        });
        return { success: true, message: 'Đã hủy đơn hàng GHN thành công' };
      }
      return { success: false, message: 'Hủy đơn hàng GHN thất bại' };
    } catch (error) {
      console.error('Error cancelling GHN order:', error);
      return { success: false, message: 'Lỗi khi hủy đơn hàng GHN' };
    }
  }

  async updateGhnOrder(
    orderId: number,
    userId: number,
    updateData: Partial<UpdateOrderDto>,
  ) {
    try {
      const order = await this.prisma.orders.findFirst({
        where: { id: orderId, user_id: userId },
        include: { shop: true },
      });

      if (!order || !order.ghn_order_code || !order.shop?.ghn_shop_id) {
        return {
          success: false,
          message: 'Không tìm thấy đơn hàng GHN hoặc thông tin shop',
        };
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

      const result = await this.deliveryService.updateShippingOrder(
        order.ghn_order_code,
        ghnUpdatePayload,
        order.shop.ghn_shop_id,
      );

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
        include: { shop: true },
      });

      if (!order || !order.ghn_order_code || !order.shop?.ghn_shop_id) {
        return {
          success: false,
          message: 'Không tìm thấy đơn hàng GHN hoặc thông tin shop',
        };
      }

      const result = await this.deliveryService.returnShippingOrder(
        [order.ghn_order_code],
        order.shop.ghn_shop_id,
      );

      if (result && result[0]?.result) {
        await this.prisma.orders.update({
          where: { id: orderId },
          data: { status: 'refunded' }, // Or a specific 'returned' status
        });
        return { success: true, message: 'Yêu cầu trả hàng GHN thành công' };
      }
      return { success: false, message: 'Yêu cầu trả hàng GHN thất bại' };
    } catch (error) {
      console.error('Error returning GHN order:', error);
      return { success: false, message: 'Lỗi khi yêu cầu trả hàng GHN' };
    }
  }

  // GHN Shipping Calculation Proxies
  async getAvailableServices(data: GetServicesDto) {
    return this.deliveryService.getAvailableServices(data);
  }

  async previewShippingOrder(data: CreateOrderDto) {
    return this.deliveryService.previewShippingOrder(data);
  }

  async getLeadtime(data: GetLeadtimeDto, shopId: number) {
    return this.deliveryService.getLeadtime(data, shopId);
  }
}
