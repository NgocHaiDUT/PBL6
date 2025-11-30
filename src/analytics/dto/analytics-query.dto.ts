import { IsOptional, IsString, IsInt, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['today', 'week', 'month', 'year', 'custom'])
  period?: string = 'month';

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export class TrendsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['day', 'week', 'month', 'year'])
  period?: string = 'month';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 12;
}

export class TopProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 5;

  @IsOptional()
  @IsString()
  @IsIn(['week', 'month', 'year', 'all'])
  period?: string = 'month';

  @IsOptional()
  @IsString()
  @IsIn(['sales', 'revenue', 'views'])
  sortBy?: string = 'sales';
}

export class RevenueBreakdownQueryDto {
  @IsOptional()
  @IsString()
  period?: string = 'month';

  @IsOptional()
  @IsString()
  @IsIn(['category', 'product', 'day', 'week', 'month'])
  groupBy?: string = 'category';
}

export class StockAlertsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  threshold?: number = 10;
}

export class NotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['order', 'stock', 'message', 'review', 'all'])
  type?: string = 'all';
}

export class OrderStatsQueryDto {
  @IsOptional()
  @IsString()
  period?: string = 'month';

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'processing', 'completed', 'cancelled', 'all'])
  status?: string = 'all';
}
