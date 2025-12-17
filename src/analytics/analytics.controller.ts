import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  TrendsQueryDto,
  TopProductsQueryDto,
  RevenueBreakdownQueryDto,
  StockAlertsQueryDto,
  NotificationsQueryDto,
  OrderStatsQueryDto,
} from './dto/analytics-query.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // 1. Get Shop Overview
  @Get('shop/:shopId/overview')
  async getOverview(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getOverview(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }

  // 2. Get Sales Trends
  @Get('shop/:shopId/sales-trends')
  async getSalesTrends(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: TrendsQueryDto,
  ) {
    return this.analyticsService.getSalesTrends(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }

  // 3. Get Top Products
  @Get('shop/:shopId/top-products')
  async getTopProducts(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: TopProductsQueryDto,
  ) {
    return this.analyticsService.getTopProducts(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }

  // 4. Get Engagement Metrics
  @Get('shop/:shopId/engagement')
  async getEngagementMetrics(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getEngagementMetrics(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }

  // 5. Get Revenue Breakdown
  @Get('shop/:shopId/revenue-breakdown')
  async getRevenueBreakdown(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: RevenueBreakdownQueryDto,
  ) {
    return this.analyticsService.getRevenueBreakdown(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }

  // 6. Get Stock Alerts
  @Get('shop/:shopId/stock-alerts')
  async getStockAlerts(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: StockAlertsQueryDto,
  ) {
    return this.analyticsService.getStockAlerts(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }

  // 7. Get Notifications
  @Get('shop/:shopId/notifications')
  async getNotifications(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.analyticsService.getNotifications(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }

  // 8. Get Order Statistics
  @Get('shop/:shopId/orders/stats')
  async getOrderStats(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: OrderStatsQueryDto,
  ) {
    return this.analyticsService.getOrderStats(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }

  // 9. Get Customer Statistics
  @Get('shop/:shopId/customers/stats')
  async getCustomerStats(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getCustomerStats(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }

  // 10. Get Conversion Funnel
  @Get('shop/:shopId/conversion-funnel')
  async getConversionFunnel(
    @Param('shopId') shopId: string,
    @Request() req,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getConversionFunnel(
      parseInt(shopId),
      req.user.userId,
      query,
    );
  }
}
