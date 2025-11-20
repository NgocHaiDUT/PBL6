import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { 
  NotificationResponse, 
  NotificationStatsResponse, 
  PaginatedNotificationsResponse 
} from './interfaces/notification.interface';

@Controller('notifications')
@UseGuards(AuthGuard('jwt')) // ✅ Require JWT for all endpoints
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @Request() req: any,
  ): Promise<NotificationResponse> {
    const userId = req.user?.sub || req.user?.userId;
    return this.notificationsService.createForUser(userId, createNotificationDto);
  }

  @Get()
  async findAll(
    @Query() queryDto: QueryNotificationsDto & { userId?: string },
    @Request() req: any,
  ): Promise<PaginatedNotificationsResponse> {
    // ✅ Use userId from query param if provided, otherwise from JWT
    const jwtUserId = req.user?.sub || req.user?.userId;
    const targetUserId = queryDto.userId ? parseInt(queryDto.userId, 10) : jwtUserId;
    console.log('🔔 [Controller] Getting notifications for user ID:', targetUserId);
    return this.notificationsService.findAllForUser(targetUserId, queryDto);
  }

  @Get('stats')
  async getStats(
    @Request() req: any,
    @Query('userId') userId?: string
  ): Promise<NotificationStatsResponse> {
    // ✅ Use userId from query if provided, otherwise from JWT
    const jwtUserId = req.user?.sub || req.user?.userId;
    const targetUserId = userId ? parseInt(userId, 10) : jwtUserId;
    console.log('🔔 [Controller] Getting notification stats for user ID:', targetUserId);
    return this.notificationsService.getStats(targetUserId);
  }

  @Post('mark-all-read')
  async markAllAsRead(
    @Body() body: { user_id?: string | number },
    @Request() req: any
  ): Promise<{ updated: number }> {
    // ✅ Use user_id from body if provided, otherwise from JWT
    const jwtUserId = req.user?.sub || req.user?.userId;
    const targetUserId = body.user_id ? (typeof body.user_id === 'string' ? parseInt(body.user_id, 10) : body.user_id) : jwtUserId;
    console.log('🔔 [Controller] Marking all as read for user ID:', targetUserId);
    return this.notificationsService.markAllAsRead(targetUserId);
  }

  @Delete('read')
  async deleteAllRead(
    @Body() body: { user_id?: string | number },
    @Request() req: any
  ): Promise<{ deleted: number }> {
    // ✅ Use user_id from body if provided, otherwise from JWT
    const jwtUserId = req.user?.sub || req.user?.userId;
    const targetUserId = body.user_id ? (typeof body.user_id === 'string' ? parseInt(body.user_id, 10) : body.user_id) : jwtUserId;
    console.log('🔔 [Controller] Deleting all read notifications for user ID:', targetUserId);
    return this.notificationsService.deleteAllRead(targetUserId);
  }

  // ✅ Route cụ thể phải đặt TRƯỚC route generic :id
  @Get(':userId/unread-count')
  async getUnreadCount(
    @Param('userId', ParseIntPipe) userId: number
  ): Promise<{ success: boolean; count: number }> {
    console.log('🔔 [Controller] Getting unread count for user ID:', userId);
    const stats = await this.notificationsService.getStats(userId);
    return { 
      success: true, 
      count: stats.unread 
    };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<NotificationResponse> {
    const userId = req.user?.sub || req.user?.userId;
    return this.notificationsService.findOne(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @Request() req: any,
  ): Promise<NotificationResponse> {
    const userId = req.user?.sub || req.user?.userId;
    return this.notificationsService.update(id, userId, updateNotificationDto);
  }

  @Patch(':id/mark-read')
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { user_id?: string | number },
    @Request() req: any,
  ): Promise<NotificationResponse> {
    // ✅ Use user_id from body if provided, otherwise from JWT
    const jwtUserId = req.user?.sub || req.user?.userId;
    const targetUserId = body.user_id ? (typeof body.user_id === 'string' ? parseInt(body.user_id, 10) : body.user_id) : jwtUserId;
    console.log('🔔 [Controller] Marking notification as read:', { id, targetUserId });
    return this.notificationsService.markAsRead(id, targetUserId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user?.sub || req.user?.userId;
    return this.notificationsService.remove(id, userId);
  }

  // Test endpoint to create sample notifications
  @Post('test/create-samples/:userId')
  async createSampleNotifications(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ success: boolean; message: string; created: number }> {
    console.log('🔔 [Controller] Creating sample notifications for user ID:', userId);
    
    const sampleNotifications = [
      {
        type: 'post_like',
        title: 'Có người thích bài viết của bạn',
        body: 'Mai Skincare đã thích bài viết của bạn về routine skincare buổi sáng',
        meta_json: {
          actor_id: 2,
          actor_name: 'Mai Skincare',
          actor_avatar: 'https://images.unsplash.com/photo-1564864310852-e1e98eb07010?w=400',
          actor_verified: false,
          post_id: 1,
          post_title: 'Routine skincare buổi sáng',
          post_image: 'https://images.unsplash.com/photo-1741896136071-3f8c1d472aa8?w=600'
        }
      },
      {
        type: 'comment_reply',
        title: 'Có người trả lời bình luận của bạn',
        body: 'Linh Beauty Expert đã trả lời: "Routine này rất hay! Bạn dùng serum vitamin C nào vậy?"',
        meta_json: {
          actor_id: 3,
          actor_name: 'Linh Beauty Expert',
          actor_avatar: 'https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=400',
          actor_verified: true,
          parent_comment_id: 4,
          parent_comment_content: 'Cảm ơn bạn đã chia sẻ routine này!',
          reply_id: 5,
          reply_content: 'Routine này rất hay! Bạn dùng serum vitamin C nào vậy?'
        }
      },
      {
        type: 'user_follow',
        title: 'Có người theo dõi bạn',
        body: 'Thảo Makeup Artist đã bắt đầu theo dõi bạn',
        meta_json: {
          actor_id: 3,
          actor_name: 'Thảo Makeup Artist',
          actor_avatar: 'https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=400',
          actor_verified: true
        }
      },
      {
        type: 'post_comment',
        title: 'Có người bình luận bài viết của bạn',
        body: 'Beauty Lover đã bình luận: "Tips rất hữu ích, cảm ơn bạn!"',
        meta_json: {
          actor_id: 5,
          actor_name: 'Beauty Lover',
          actor_avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c5?w=400',
          actor_verified: false,
          post_id: 2,
          post_title: 'Cách chọn kem chống nắng phù hợp',
          comment_id: 7,
          comment_content: 'Tips rất hữu ích, cảm ơn bạn!'
        }
      }
    ];

    let created = 0;
    for (const notification of sampleNotifications) {
      try {
        await this.notificationsService.createForUser(userId, notification);
        created++;
      } catch (error) {
        console.error('Error creating sample notification:', error);
      }
    }

    return {
      success: true,
      message: `Created ${created} sample notifications for user ${userId}`,
      created
    };
  }
}