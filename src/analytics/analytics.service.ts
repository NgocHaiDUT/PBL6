import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsQueryDto,
  TrendsQueryDto,
  TopProductsQueryDto,
  RevenueBreakdownQueryDto,
  StockAlertsQueryDto,
  NotificationsQueryDto,
  OrderStatsQueryDto,
} from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Helper: Check if user has access to shop
  private async checkShopAccess(shopId: number, userId: number) {
    const shop = await this.prisma.shops.findFirst({
      where: {
        id: shopId,
        owner_id: userId,
      },
    });

    if (!shop) {
      const shopStaff = await this.prisma.shop_staffs.findFirst({
        where: {
          shop_id: shopId,
          user_id: userId,
        },
      });

      if (!shopStaff) {
        throw new ForbiddenException('You do not have access to this shop');
      }
    }
  }

  // Helper: Get date range from period
  private getDateRange(period: string, startDate?: string, endDate?: string) {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        end = endDate ? new Date(endDate) : now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end };
  }

  // 1. Get Shop Overview Statistics
  async getOverview(shopId: number, userId: number, query: AnalyticsQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { period = 'month', startDate, endDate } = query;
    const { start, end } = this.getDateRange(period, startDate, endDate);

    // Get orders statistics
    const orders = await this.prisma.orders.findMany({
      where: {
        shop_id: shopId,
        created_at: {
          gte: start,
          lte: end,
        },
      },
      select: {
        total_amount: true,
        status: true,
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === 'delivered').length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;

    // Get product statistics
    const products = await this.prisma.products.count({
      where: { shop_id: shopId },
    });

    // Get customer count (unique users who ordered)
    const customers = await this.prisma.orders.findMany({
      where: {
        shop_id: shopId,
        created_at: {
          gte: start,
          lte: end,
        },
      },
      distinct: ['user_id'],
      select: { user_id: true },
    });

    // Calculate growth rates (compare with previous period)
    const periodDuration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodDuration);
    const prevEnd = start;

    const prevOrders = await this.prisma.orders.findMany({
      where: {
        shop_id: shopId,
        created_at: {
          gte: prevStart,
          lt: prevEnd,
        },
      },
      select: { total_amount: true },
    });

    const prevRevenue = prevOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const ordersGrowth = prevOrders.length > 0 ? ((totalOrders - prevOrders.length) / prevOrders.length) * 100 : 0;

    return {
      period,
      dateRange: { start, end },
      overview: {
        totalRevenue,
        totalOrders,
        completedOrders,
        pendingOrders,
        totalProducts: products,
        totalCustomers: customers.length,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        conversionRate: 0, // Would need view tracking
      },
      growth: {
        revenue: revenueGrowth,
        orders: ordersGrowth,
      },
    };
  }

  // 2. Get Sales Trends
  async getSalesTrends(shopId: number, userId: number, query: TrendsQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { period = 'month', limit = 12 } = query;
    const trends: Array<{
      label: string;
      period: { start: Date; end: Date };
      revenue: number;
      orders: number;
    }> = [];

    for (let i = limit - 1; i >= 0; i--) {
      let start: Date = new Date();
      let end: Date = new Date();
      let label: string = '';

      switch (period) {
        case 'day':
          start = new Date();
          start.setDate(start.getDate() - i);
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setHours(23, 59, 59, 999);
          label = start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          break;
        case 'week':
          start = new Date();
          start.setDate(start.getDate() - (i * 7));
          end = new Date(start);
          end.setDate(end.getDate() + 6);
          label = `Tuần ${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
          break;
        case 'month':
          start = new Date();
          start.setMonth(start.getMonth() - i);
          start.setDate(1);
          end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
          label = start.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
          break;
        case 'year':
          start = new Date();
          start.setFullYear(start.getFullYear() - i);
          start.setMonth(0, 1);
          end = new Date(start.getFullYear(), 11, 31);
          label = start.getFullYear().toString();
          break;
      }

      const orders = await this.prisma.orders.findMany({
        where: {
          shop_id: shopId,
          created_at: {
            gte: start,
            lte: end,
          },
        },
        select: { total_amount: true },
      });

      const revenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);

      trends.push({
        label,
        period: { start, end },
        revenue,
        orders: orders.length,
      });
    }

    return { period, data: trends };
  }

  // 3. Get Top Products
  async getTopProducts(shopId: number, userId: number, query: TopProductsQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { limit = 5, period = 'month', sortBy = 'sales' } = query;
    const { start, end } = this.getDateRange(period);

    const orderItems = await this.prisma.order_items.findMany({
      where: {
        order: {
          shop_id: shopId,
          created_at: {
            gte: start,
            lte: end,
          },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            product_media: {
              select: {
                url: true,
                type: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    // Group by product
    const productStats = orderItems.reduce((acc, item) => {
      const productId = item.product_id;
      if (!acc[productId]) {
        acc[productId] = {
          product: item.product,
          totalSales: 0,
          totalRevenue: 0,
          totalQuantity: 0,
        };
      }
      acc[productId].totalSales++;
      acc[productId].totalRevenue += Number(item.unit_price) * item.quantity;
      acc[productId].totalQuantity += item.quantity;
      return acc;
    }, {});

    // Convert to array and sort
    let topProducts = Object.values(productStats);

    switch (sortBy) {
      case 'sales':
        topProducts.sort((a: any, b: any) => b.totalSales - a.totalSales);
        break;
      case 'revenue':
        topProducts.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
        break;
      case 'views':
        // Would need view tracking
        break;
    }

    return {
      period,
      sortBy,
      data: topProducts.slice(0, limit),
    };
  }

  // 4. Get Engagement Metrics
  async getEngagementMetrics(shopId: number, userId: number, query: AnalyticsQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { period = 'month' } = query;
    const { start, end } = this.getDateRange(period);

    // Get shop followers
    const followers = await this.prisma.follows.count({
      where: {
        following_id: shopId, // Assuming follows table tracks shop follows
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });

    // Get product likes
    const products = await this.prisma.products.findMany({
      where: { shop_id: shopId },
      select: { id: true },
    });

    const productIds = products.map((p) => p.id);

    const likes = await this.prisma.likes.count({
      where: {
        target_type: 'product',
        target_id: { in: productIds },
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });

    // Get comments
    const comments = await this.prisma.comments.count({
      where: {
        target_type: 'product',
        target_id: { in: productIds },
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });

    // Get message conversations
    const conversations = await this.prisma.conversations.count({
      where: {
        type: 'user_shop',
        participants: {
          some: {
            shop_id: shopId,
            entity_type: 'shop',
          },
        },
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });

    return {
      period,
      engagement: {
        newFollowers: followers,
        totalLikes: likes,
        totalComments: comments,
        newConversations: conversations,
      },
    };
  }

  // 5. Get Revenue Breakdown
  async getRevenueBreakdown(shopId: number, userId: number, query: RevenueBreakdownQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { period = 'month', groupBy = 'category' } = query;
    const { start, end } = this.getDateRange(period);

    if (groupBy === 'category') {
      const orderItems = await this.prisma.order_items.findMany({
        where: {
          order: {
            shop_id: shopId,
            created_at: {
              gte: start,
              lte: end,
            },
          },
        },
        include: {
          product: {
            include: {
              product_categories: {
                include: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const categoryStats = orderItems.reduce((acc, item) => {
        // Get first category if product has multiple categories
        const category = item.product.product_categories[0]?.category;
        const categoryId = category?.id || 0;
        const categoryName = category?.name || 'Uncategorized';
        if (!acc[categoryId]) {
          acc[categoryId] = {
            category: categoryName,
            revenue: 0,
            orders: 0,
          };
        }
        acc[categoryId].revenue += Number(item.unit_price) * item.quantity;
        acc[categoryId].orders++;
        return acc;
      }, {});

      return {
        period,
        groupBy,
        data: Object.values(categoryStats),
      };
    }

    // Add other groupBy options as needed
    return { period, groupBy, data: [] };
  }

  // 6. Get Stock Alerts
  async getStockAlerts(shopId: number, userId: number, query: StockAlertsQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { threshold = 10 } = query;

    const lowStockProducts = await this.prisma.product_variants.findMany({
      where: {
        product: {
          shop_id: shopId,
        },
        stock: {
          lte: threshold,
          gt: 0,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            product_media: {
              select: {
                url: true,
                type: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        stock: 'asc',
      },
    });

    const outOfStockProducts = await this.prisma.product_variants.findMany({
      where: {
        product: {
          shop_id: shopId,
        },
        stock: 0,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            product_media: {
              select: {
                url: true,
                type: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    return {
      threshold,
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
      summary: {
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
      },
    };
  }

  // 7. Get Notifications/Activities
  async getNotifications(shopId: number, userId: number, query: NotificationsQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { limit = 10, type = 'all' } = query;

    // Get recent orders
    const recentOrders = type === 'all' || type === 'order'
      ? await this.prisma.orders.findMany({
          where: { shop_id: shopId },
          orderBy: { created_at: 'desc' },
          take: limit,
          select: {
            id: true,
            status: true,
            total_amount: true,
            created_at: true,
            user: {
              select: {
                full_name: true,
              },
            },
          },
        })
      : [];

    // Get recent messages
    const recentMessages = type === 'all' || type === 'message'
      ? await this.prisma.messages.findMany({
          where: {
            conversation: {
              participants: {
                some: {
                  shop_id: shopId,
                  entity_type: 'shop',
                },
              },
            },
            sender_type: 'user', // Only user messages to shop
          },
          orderBy: { created_at: 'desc' },
          take: limit,
          include: {
            sender: {
              select: {
                full_name: true,
              },
            },
          },
        })
      : [];

    // Format notifications
    const notifications = [
      ...recentOrders.map((order) => ({
        id: `order_${order.id}`,
        type: 'order',
        title: 'New Order',
        message: `${order.user.full_name} placed an order`,
        metadata: order,
        createdAt: order.created_at,
      })),
      ...recentMessages.map((msg) => ({
        id: `message_${msg.id}`,
        type: 'message',
        title: 'New Message',
        message: `${msg.sender?.full_name} sent you a message`,
        metadata: msg,
        createdAt: msg.created_at,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return {
      type,
      limit,
      data: notifications,
    };
  }

  // 8. Get Order Statistics
  async getOrderStats(shopId: number, userId: number, query: OrderStatsQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { period = 'month', status = 'all' } = query;
    const { start, end } = this.getDateRange(period);

    const whereClause: any = {
      shop_id: shopId,
      created_at: {
        gte: start,
        lte: end,
      },
    };

    if (status !== 'all') {
      whereClause.status = status;
    }

    const orders = await this.prisma.orders.findMany({
      where: whereClause,
      select: {
        status: true,
        total_amount: true,
      },
    });

    const stats = {
      total: orders.length,
      byStatus: {
        pending: orders.filter((o) => o.status === 'pending').length,
        processing: orders.filter((o) => o.status === 'processing').length,
        shipped: orders.filter((o) => o.status === 'shipped').length,
        delivered: orders.filter((o) => o.status === 'delivered').length,
        cancelled: orders.filter((o) => o.status === 'cancelled').length,
      },
      totalRevenue: orders.reduce((sum, order) => sum + Number(order.total_amount), 0),
    };

    return {
      period,
      status,
      stats,
    };
  }

  // 9. Get Customer Statistics
  async getCustomerStats(shopId: number, userId: number, query: AnalyticsQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { period = 'month' } = query;
    const { start, end } = this.getDateRange(period);

    // Get unique customers in period
    const customers = await this.prisma.orders.findMany({
      where: {
        shop_id: shopId,
        created_at: {
          gte: start,
          lte: end,
        },
      },
      distinct: ['user_id'],
      select: {
        user_id: true,
      },
    });

    // Get returning customers (ordered before this period)
    const returningCustomers = await this.prisma.orders.findMany({
      where: {
        shop_id: shopId,
        user_id: { in: customers.map((c) => c.user_id) },
        created_at: {
          lt: start,
        },
      },
      distinct: ['user_id'],
      select: { user_id: true },
    });

    const newCustomers = customers.length - returningCustomers.length;

    return {
      period,
      stats: {
        totalCustomers: customers.length,
        newCustomers,
        returningCustomers: returningCustomers.length,
        retentionRate: customers.length > 0 ? (returningCustomers.length / customers.length) * 100 : 0,
      },
    };
  }

  // 10. Get Conversion Funnel
  async getConversionFunnel(shopId: number, userId: number, query: AnalyticsQueryDto) {
    await this.checkShopAccess(shopId, userId);

    const { period = 'month' } = query;
    const { start, end } = this.getDateRange(period);

    // Get products
    const products = await this.prisma.products.findMany({
      where: { shop_id: shopId },
      select: { id: true },
    });

    const productIds = products.map((p) => p.id);

    // Product views (would need tracking)
    const views = 0; // Placeholder

    // Cart additions
    const cartAdditions = await this.prisma.cart_items.count({
      where: {
        product_id: { in: productIds },
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });

    // Orders
    const orders = await this.prisma.orders.count({
      where: {
        shop_id: shopId,
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });

    // Completed orders
    const completedOrders = await this.prisma.orders.count({
      where: {
        shop_id: shopId,
        status: 'delivered',
        created_at: {
          gte: start,
          lte: end,
        },
      },
    });

    return {
      period,
      funnel: {
        views: { count: views, label: 'Product Views' },
        cartAdditions: { count: cartAdditions, label: 'Add to Cart', rate: 0 },
        orders: { count: orders, label: 'Orders Placed', rate: cartAdditions > 0 ? (orders / cartAdditions) * 100 : 0 },
        completed: { count: completedOrders, label: 'Completed', rate: orders > 0 ? (completedOrders / orders) * 100 : 0 },
      },
    };
  }
}
