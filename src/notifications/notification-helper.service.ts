import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationHelperService {
  constructor(
    private notificationsService: NotificationsService,
    private prisma: PrismaService
  ) {}

  // Like notifications
  async handlePostLike(postId: number, likerId: number, liked: boolean): Promise<void> {
    try {
      // Get post info and owner
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
        include: {
          user: {
            select: { id: true, full_name: true }
          }
        }
      });

      if (!post || !post.user || post.user.id === likerId) {
        return; // Don't notify self-likes or if post not found
      }

      // Get liker info
      const liker = await this.prisma.users.findUnique({
        where: { id: likerId },
        select: { id: true, full_name: true, avatar_url: true }
      });

      if (!liker || !liked) {
        return; // Only notify on like, not unlike
      }

      // Create notification with actor_id in meta_json
      await this.notificationsService.createForUser(post.user.id, {
        type: 'post_like',
        title: 'Có người thích bài viết của bạn',
        body: `${liker.full_name || 'Someone'} đã thích bài viết của bạn`,
        meta_json: {
          actor_id: likerId,
          actor_name: liker.full_name || 'Someone',
          actor_avatar: liker.avatar_url,
          post_id: postId,
          post_title: post.title
        }
      });

      console.log('🔔 [NotificationHelper] Post like notification sent:', {
        to: post.user.id,
        from: liker.full_name,
        postId,
        actorId: likerId
      });
    } catch (error) {
      console.error('❌ [NotificationHelper] Error creating post like notification:', error);
    }
  }

  async handleCommentLike(commentId: number, likerId: number, liked: boolean): Promise<void> {
    try {
      // Get comment info and owner
      const comment = await this.prisma.comments.findUnique({
        where: { id: commentId },
        include: {
          user: {
            select: { id: true, full_name: true }
          }
        }
      });

      if (!comment || !comment.user || comment.user.id === likerId) {
        return; // Don't notify self-likes or if comment not found
      }

      // Get liker info
      const liker = await this.prisma.users.findUnique({
        where: { id: likerId },
        select: { id: true, full_name: true, avatar_url: true }
      });

      if (!liker || !liked) {
        return; // Only notify on like, not unlike
      }

      // Create notification with actor_id in meta_json
      await this.notificationsService.createForUser(comment.user.id, {
        type: 'comment_like',
        title: 'Có người thích bình luận của bạn',
        body: `${liker.full_name || 'Someone'} đã thích bình luận của bạn`,
        meta_json: {
          actor_id: likerId,
          actor_name: liker.full_name || 'Someone',
          actor_avatar: liker.avatar_url,
          comment_id: commentId,
          comment_content: comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : '')
        }
      });

      console.log('🔔 [NotificationHelper] Comment like notification sent:', {
        to: comment.user.id,
        from: liker.full_name,
        commentId,
        actorId: likerId
      });
    } catch (error) {
      console.error('❌ [NotificationHelper] Error creating comment like notification:', error);
    }
  }

  // Follow notifications
  async handleFollow(followingId: number, followerId: number, following: boolean): Promise<void> {
    try {
      if (!following || followingId === followerId) {
        return; // Only notify on follow, not unfollow, and don't notify self-follows
      }

      // Get follower info
      const follower = await this.prisma.users.findUnique({
        where: { id: followerId },
        select: { id: true, full_name: true, avatar_url: true }
      });

      if (!follower) {
        return;
      }

      // Create notification with actor_id in meta_json
      await this.notificationsService.createForUser(followingId, {
        type: 'user_follow',
        title: 'Có người theo dõi bạn',
        body: `${follower.full_name || 'Someone'} đã bắt đầu theo dõi bạn`,
        meta_json: {
          actor_id: followerId,
          actor_name: follower.full_name || 'Someone',
          actor_avatar: follower.avatar_url
        }
      });

      console.log('🔔 [NotificationHelper] Follow notification sent:', {
        to: followingId,
        from: follower.full_name,
        actorId: followerId
      });
    } catch (error) {
      console.error('❌ [NotificationHelper] Error creating follow notification:', error);
    }
  }

  // Comment notifications
  async handleComment(commentData: any, userId: number): Promise<void> {
    try {
      // Get commenter info
      const commenter = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { id: true, full_name: true, avatar_url: true }
      });

      if (!commenter) {
        return;
      }

      // Handle post comment
      if (commentData.target_type === 'post') {
        const post = await this.prisma.posts.findUnique({
          where: { id: commentData.target_id },
          include: {
            user: {
              select: { id: true, full_name: true }
            }
          }
        });

        if (post && post.user && post.user.id !== userId) {
          // Notify post owner with actor_id in meta_json
          await this.notificationsService.createForUser(post.user.id, {
            type: 'post_comment',
            title: 'Có người bình luận bài viết của bạn',
            body: `${commenter.full_name || 'Someone'} đã bình luận bài viết của bạn: "${commentData.content.substring(0, 50)}${commentData.content.length > 50 ? '...' : ''}"`,
            meta_json: {
              actor_id: userId,
              actor_name: commenter.full_name || 'Someone',
              actor_avatar: commenter.avatar_url,
              post_id: commentData.target_id,
              post_title: post.title,
              comment_id: commentData.id || null,
              comment_content: commentData.content
            }
          });

          console.log('🔔 [NotificationHelper] Post comment notification sent:', {
            to: post.user.id,
            from: commenter.full_name,
            postId: commentData.target_id,
            actorId: userId
          });
        }
      }

      // Handle comment reply
      if (commentData.parent_id) {
        const parentComment = await this.prisma.comments.findUnique({
          where: { id: commentData.parent_id },
          include: {
            user: {
              select: { id: true, full_name: true }
            }
          }
        });

        if (parentComment && parentComment.user && parentComment.user.id !== userId) {
          // Notify parent comment owner with actor_id in meta_json
          await this.notificationsService.createForUser(parentComment.user.id, {
            type: 'comment_reply',
            title: 'Có người trả lời bình luận của bạn',
            body: `${commenter.full_name || 'Someone'} đã trả lời bình luận của bạn: "${commentData.content.substring(0, 50)}${commentData.content.length > 50 ? '...' : ''}"`,
            meta_json: {
              actor_id: userId,
              actor_name: commenter.full_name || 'Someone',
              actor_avatar: commenter.avatar_url,
              parent_comment_id: commentData.parent_id,
              parent_comment_content: parentComment.content.substring(0, 50) + (parentComment.content.length > 50 ? '...' : ''),
              reply_id: commentData.id || null,
              reply_content: commentData.content
            }
          });

          console.log('🔔 [NotificationHelper] Comment reply notification sent:', {
            to: parentComment.user.id,
            from: commenter.full_name,
            parentCommentId: commentData.parent_id,
            actorId: userId
          });
        }
      }
    } catch (error) {
      console.error('❌ [NotificationHelper] Error creating comment notification:', error);
    }
  }
}