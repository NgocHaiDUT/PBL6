import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { 
  NotificationResponse, 
  NotificationStatsResponse, 
  PaginatedNotificationsResponse,
  CreateNotificationData 
} from './interfaces/notification.interface';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificationData: CreateNotificationData): Promise<NotificationResponse> {
    const notification = await this.prisma.notifications.create({
      data: {
        user_id: createNotificationData.user_id,
        type: createNotificationData.type,
        title: createNotificationData.title,
        body: createNotificationData.body,
        meta_json: createNotificationData.meta_json ? JSON.stringify(createNotificationData.meta_json) : null,
      }
    });

    return notification;
  }

  async createForUser(userId: number, createNotificationDto: CreateNotificationDto): Promise<NotificationResponse> {
    return this.create({
      user_id: userId,
      ...createNotificationDto,
    });
  }

  async findAllForUser(userId: number, queryDto: QueryNotificationsDto): Promise<PaginatedNotificationsResponse> {
    const { type, is_read, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { user_id: userId };
    if (type) where.type = type;
    if (is_read !== undefined) where.is_read = is_read;

    const [notifications, total] = await Promise.all([
      this.prisma.notifications.findMany({
        where,
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.notifications.count({ where }),
    ]);

    return {
      data: notifications,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, userId: number): Promise<NotificationResponse> {
    const notification = await this.prisma.notifications.findFirst({
      where: {
        id,
        user_id: userId,
      }
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async update(id: number, userId: number, updateNotificationDto: UpdateNotificationDto): Promise<NotificationResponse> {
    console.log('🔔 [Service] Updating notification:', { id, userId, updateData: updateNotificationDto });
    
    const existingNotification = await this.prisma.notifications.findFirst({
      where: {
        id,
        user_id: userId,
      }
    });

    console.log('🔔 [Service] Found existing notification:', existingNotification ? 'YES' : 'NO');
    
    if (!existingNotification) {
      console.error('🔔 [Service] Notification not found for:', { id, userId });
      throw new NotFoundException(`Notification not found for user ${userId} with ID ${id}`);
    }

    const updatedNotification = await this.prisma.notifications.update({
      where: { id },
      data: updateNotificationDto,
    });

    return updatedNotification;
  }

  async remove(id: number, userId: number): Promise<void> {
    const existingNotification = await this.prisma.notifications.findFirst({
      where: {
        id,
        user_id: userId,
      }
    });

    if (!existingNotification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notifications.delete({
      where: { id }
    });
  }

  async markAsRead(id: number, userId: number): Promise<NotificationResponse> {
    console.log('🔔 [Service] Marking notification as read:', { id, userId });
    try {
      const result = await this.update(id, userId, { is_read: true });
      console.log('🔔 [Service] Successfully marked as read:', result.id);
      return result;
    } catch (error) {
      console.error('🔔 [Service] Failed to mark as read:', error.message);
      throw error;
    }
  }

  async markAllAsRead(userId: number): Promise<{ updated: number }> {
    const result = await this.prisma.notifications.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
      }
    });

    return { updated: result.count };
  }

  async getStats(userId: number): Promise<NotificationStatsResponse> {
    const [total, unread] = await Promise.all([
      this.prisma.notifications.count({
        where: { user_id: userId }
      }),
      this.prisma.notifications.count({
        where: { 
          user_id: userId,
          is_read: false 
        }
      })
    ]);

    return {
      total,
      unread,
      read: total - unread,
    };
  }

  async deleteAllRead(userId: number): Promise<{ deleted: number }> {
    const result = await this.prisma.notifications.deleteMany({
      where: {
        user_id: userId,
        is_read: true,
      }
    });

    return { deleted: result.count };
  }

  // Helper methods for creating specific notification types
  async createLikeNotification(targetUserId: number, likerName: string, targetType: string, targetId: number): Promise<NotificationResponse> {
    return this.create({
      user_id: targetUserId,
      type: 'like',
      title: 'New Like',
      body: `${likerName} liked your ${targetType}`,
      meta_json: {
        target_type: targetType,
        target_id: targetId,
        action: 'like'
      }
    });
  }

  async createCommentNotification(targetUserId: number, commenterName: string, targetType: string, targetId: number): Promise<NotificationResponse> {
    return this.create({
      user_id: targetUserId,
      type: 'comment',
      title: 'New Comment',
      body: `${commenterName} commented on your ${targetType}`,
      meta_json: {
        target_type: targetType,
        target_id: targetId,
        action: 'comment'
      }
    });
  }

  async createFollowNotification(targetUserId: number, followerName: string): Promise<NotificationResponse> {
    return this.create({
      user_id: targetUserId,
      type: 'follow',
      title: 'New Follower',
      body: `${followerName} started following you`,
      meta_json: {
        action: 'follow'
      }
    });
  }

  async createOrderNotification(userId: number, orderId: number, status: string): Promise<NotificationResponse> {
    const statusMessages = {
      confirmed: 'Your order has been confirmed',
      shipped: 'Your order has been shipped',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled',
    };

    return this.create({
      user_id: userId,
      type: 'order',
      title: 'Order Update',
      body: statusMessages[status] || `Your order status: ${status}`,
      meta_json: {
        order_id: orderId,
        status,
        action: 'order_update'
      }
    });
  }
}