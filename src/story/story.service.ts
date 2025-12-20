import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { QueryStoriesDto } from './dto/query-stories.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { AddReplyDto } from './dto/add-reply.dto';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class StoryService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) { }

  /**
   * Create a new story
   */
  async createStory(
    userId: number,
    createStoryDto: CreateStoryDto,
    mediaUrl: string,
    thumbnailUrl?: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expire after 24 hours

    // Create story as a post with is_story=true
    const story = await this.prisma.posts.create({
      data: {
        user_id: userId,
        post_type: 'story', // Set post_type to 'story' instead of default 'post'
        is_story: true,
        story_type: createStoryDto.story_type,
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        caption: createStoryDto.caption,
        duration: createStoryDto.duration,
        background_color: createStoryDto.background_color,
        text_color: createStoryDto.text_color,
        text_position: createStoryDto.text_position,
        expires_at: expiresAt,
        content_md: createStoryDto.caption || '', // Required field
        moderation_status: 'approved', // Auto-approve stories
        visibility: 'public',
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    // Add product tags if any
    if (createStoryDto.product_ids && createStoryDto.product_ids.length > 0) {
      await this.prisma.post_products.createMany({
        data: createStoryDto.product_ids.map((product_id) => ({
          post_id: story.id,
          product_id,
        })),
        skipDuplicates: true,
      });
    }

    return {
      success: true,
      data: story,
      message: 'Story created successfully',
    };
  }

  /**
   * Get active stories (not expired)
   */
  async getActiveStories(queryDto: QueryStoriesDto, currentUserId?: number) {
    const { page = 1, limit = 20, active_only = true, following_only = false, user_id } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      is_story: true,
    };

    // Filter by active/expired
    if (active_only) {
      where.expires_at = {
        gt: new Date(), // Not expired yet
      };
    }

    // Filter by specific user
    if (user_id) {
      where.user_id = user_id;
    }

    // Filter by following users only
    if (following_only && currentUserId) {
      const following = await this.prisma.follows.findMany({
        where: { follower_id: currentUserId },
        select: { following_id: true },
      });
      const followingIds = following.map((f) => f.following_id);
      followingIds.push(currentUserId); // Include own stories
      where.user_id = { in: followingIds };
    }

    const [stories, total] = await Promise.all([
      this.prisma.posts.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }, // Order stories by creation time descending
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            },
          },
          post_products: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          story_views: {
            select: {
              viewer_id: true,
              viewed_at: true,
            },
          },
          _count: {
            select: {
              story_views: true,
            },
          },
        },
      }),
      this.prisma.posts.count({ where }),
    ]);

    // Group stories by user
    const storiesByUser = stories.reduce((acc, story) => {
      const userId = story.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          user: story.user,
          stories: [],
          has_unseen: false,
          latest_story_time: new Date(story.created_at).getTime(), // Track latest story time for sorting
        };
      }

      // Update latest story time if this story is newer
      const storyTime = new Date(story.created_at).getTime();
      if (storyTime > acc[userId].latest_story_time) {
        acc[userId].latest_story_time = storyTime;
      }

      // Check if current user has viewed this story
      const hasViewed = currentUserId
        ? story.story_views.some((view) => view.viewer_id === currentUserId)
        : false;

      if (!hasViewed) {
        acc[userId].has_unseen = true;
      }

      acc[userId].stories.push({
        ...story,
        has_viewed: hasViewed,
      });

      return acc;
    }, {} as Record<number, any>);

    // Convert to array and sort
    const groupedStories = Object.values(storiesByUser).map((group: any) => {
      // Sort stories within each group by created_at ascending (oldest first, newest last)
      group.stories.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Remove temporary field
      const { latest_story_time, ...rest } = group;
      return rest;
    });

    // Sort groups by latest story time descending (most recent user first)
    groupedStories.sort((a: any, b: any) => {
      const latestA = Math.max(...a.stories.map((s: any) => new Date(s.created_at).getTime()));
      const latestB = Math.max(...b.stories.map((s: any) => new Date(s.created_at).getTime()));
      return latestB - latestA;
    });

    return {
      success: true,
      data: groupedStories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single story by ID
   */
  async getStoryById(storyId: number, userId?: number) {
    const story = await this.prisma.posts.findFirst({
      where: {
        id: storyId,
        is_story: true,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
        post_products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                product_media: {
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
        story_views: {
          include: {
            viewer: {
              select: {
                id: true,
                full_name: true,
                avatar_url: true,
              },
            },
          },
          orderBy: { viewed_at: 'desc' },
        },
        _count: {
          select: {
            story_views: true,
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Check if expired
    if (story.expires_at && new Date() > story.expires_at) {
      throw new NotFoundException('Story has expired');
    }

    // Get reactions (using likes table with story_ prefix)
    const reactionsRaw = await this.prisma.likes.findMany({
      where: {
        target_id: storyId,
        target_type: {
          startsWith: 'story_',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Parse emoji from target_type (story_❤️ -> ❤️)
    const reactions = reactionsRaw.map((reaction) => ({
      ...reaction,
      emoji: reaction.target_type.replace('story_', ''),
    }));

    // Get replies (using comments table)
    const replies = await this.prisma.comments.findMany({
      where: {
        target_type: 'post',
        target_id: storyId,
        parent_id: null, // Only top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: {
        ...story,
        reactions,
        replies,
      },
    };
  }

  /**
   * Update story (only caption and text styling)
   */
  async updateStory(storyId: number, userId: number, updateDto: UpdateStoryDto) {
    const story = await this.prisma.posts.findFirst({
      where: {
        id: storyId,
        is_story: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.user_id !== userId) {
      throw new ForbiddenException('You can only update your own stories');
    }

    if (story.expires_at && new Date() > story.expires_at) {
      throw new BadRequestException('Cannot update expired story');
    }

    const updated = await this.prisma.posts.update({
      where: { id: storyId },
      data: {
        caption: updateDto.caption,
        background_color: updateDto.background_color,
        text_color: updateDto.text_color,
        text_position: updateDto.text_position,
        content_md: updateDto.caption || story.content_md,
      },
    });

    return {
      success: true,
      data: updated,
      message: 'Story updated successfully',
    };
  }

  /**
   * Delete story
   */
  async deleteStory(storyId: number, userId: number) {
    const story = await this.prisma.posts.findFirst({
      where: {
        id: storyId,
        is_story: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own stories');
    }

    await this.prisma.posts.delete({
      where: { id: storyId },
    });

    return {
      success: true,
      message: 'Story deleted successfully',
    };
  }

  /**
   * Mark story as viewed
   */
  async markAsViewed(storyId: number, viewerId: number) {
    const story = await this.prisma.posts.findFirst({
      where: {
        id: storyId,
        is_story: true,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.expires_at && new Date() > story.expires_at) {
      throw new BadRequestException('Story has expired');
    }

    // Don't notify if viewing own story
    if (story.user_id === viewerId) {
      return {
        success: true,
        message: 'Story marked as viewed',
      };
    }

    // Check if this is a new view
    const existingView = await this.prisma.story_views.findUnique({
      where: {
        post_id_viewer_id: {
          post_id: storyId,
          viewer_id: viewerId,
        },
      },
    });

    const isNewView = !existingView;

    // Create or update view
    await this.prisma.story_views.upsert({
      where: {
        post_id_viewer_id: {
          post_id: storyId,
          viewer_id: viewerId,
        },
      },
      create: {
        post_id: storyId,
        viewer_id: viewerId,
      },
      update: {
        viewed_at: new Date(),
      },
    });

    // Increment view count only for new views
    if (isNewView) {
      await this.prisma.posts.update({
        where: { id: storyId },
        data: {
          view_count: {
            increment: 1,
          },
        },
      });

      // Get viewer info
      const viewer = await this.prisma.users.findUnique({
        where: { id: viewerId },
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
        },
      });

      // Send notification to story owner
      if (viewer) {
        try {
          await this.prisma.notifications.create({
            data: {
              user_id: story.user_id,
              type: 'story_view',
              title: 'Lượt xem tin mới',
              body: `${viewer.full_name} đã xem tin của bạn`,
              meta_json: JSON.stringify({
                story_id: storyId,
                actor_id: viewerId,
                actor_name: viewer.full_name,
                actor_avatar: viewer.avatar_url,
                action: 'view_story',
              }),
            },
          });

          // Emit realtime notification via socket
          this.chatGateway.server.to(`${story.user_id}`).emit('notification', {
            type: 'story_view',
            title: 'Lượt xem tin mới',
            message: `${viewer.full_name} đã xem tin của bạn`,
            data: {
              story_id: storyId,
              viewer_id: viewerId,
              viewer_name: viewer.full_name,
              viewer_avatar: viewer.avatar_url,
            },
          });
        } catch (error) {
          console.error('Error creating story view notification:', error);
        }
      }
    }

    return {
      success: true,
      message: 'Story marked as viewed',
    };
  }

  /**
   * Add reaction to story
   */
  async addReaction(storyId: number, userId: number, reactionDto: AddReactionDto) {
    const story = await this.prisma.posts.findFirst({
      where: {
        id: storyId,
        is_story: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.expires_at && new Date() > story.expires_at) {
      throw new BadRequestException('Story has expired');
    }

    // Use likes table with emoji in a JSON field or create a new like
    // For simplicity, we'll store emoji in the target_type field combined
    const reaction = await this.prisma.likes.upsert({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: `story_${reactionDto.emoji}`, // Store emoji in target_type with story_ prefix
          target_id: storyId,
        },
      },
      create: {
        user_id: userId,
        target_type: `story_${reactionDto.emoji}`,
        target_id: storyId,
      },
      update: {
        created_at: new Date(),
      },
    });


    // Increment like count
    await this.prisma.posts.update({
      where: { id: storyId },
      data: {
        like_count: {
          increment: 1,
        },
      },
    });

    // Send notification to story owner (don't notify self)
    if (story.user_id !== userId) {
      try {
        const reactor = await this.prisma.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        });

        if (reactor) {
          await this.prisma.notifications.create({
            data: {
              user_id: story.user_id,
              type: 'story_reaction',
              title: 'Reaction mới trên tin',
              body: `${reactor.full_name} đã thả ${reactionDto.emoji} vào tin của bạn`,
              meta_json: JSON.stringify({
                story_id: storyId,
                actor_id: userId,
                actor_name: reactor.full_name,
                actor_avatar: reactor.avatar_url,
                emoji: reactionDto.emoji,
                action: 'react_story',
              }),
            },
          });

          // Emit realtime notification via socket
          this.chatGateway.server.to(`${story.user_id}`).emit('notification', {
            type: 'story_reaction',
            title: 'Reaction mới trên tin',
            message: `${reactor.full_name} đã thả ${reactionDto.emoji} vào tin của bạn`,
            data: {
              story_id: storyId,
              reactor_id: userId,
              reactor_name: reactor.full_name,
              reactor_avatar: reactor.avatar_url,
              emoji: reactionDto.emoji,
            },
          });
        }
      } catch (error) {
        console.error('Error creating story reaction notification:', error);
      }
    }

    return {
      success: true,
      data: reaction,
      message: 'Reaction added successfully',
    };
  }

  /**
   * Remove reaction from story
   */
  async removeReaction(storyId: number, userId: number) {
    const story = await this.prisma.posts.findFirst({
      where: {
        id: storyId,
        is_story: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Delete all reactions from this user on this story
    const deleted = await this.prisma.likes.deleteMany({
      where: {
        user_id: userId,
        target_id: storyId,
        target_type: {
          startsWith: 'story_',
        },
      },
    });

    if (deleted.count > 0) {
      // Decrement like count
      await this.prisma.posts.update({
        where: { id: storyId },
        data: {
          like_count: {
            decrement: deleted.count,
          },
        },
      });
    }

    return {
      success: true,
      message: 'Reaction removed successfully',
    };
  }

  /**
   * Add reply to story
   * Instead of creating a comment, this will send a direct message to the story owner
   * with a story card attachment
   */
  async addReply(storyId: number, userId: number, replyDto: AddReplyDto) {
    const story = await this.prisma.posts.findFirst({
      where: {
        id: storyId,
        is_story: true,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.expires_at && new Date() > story.expires_at) {
      throw new BadRequestException('Story has expired');
    }

    // Cannot reply to own story
    if (story.user_id === userId) {
      throw new BadRequestException('Cannot reply to your own story');
    }

    // Find or create conversation between the replier and story owner
    const participants = [userId, story.user_id].sort();

    // Find existing private conversation
    const conversations = await this.prisma.conversations.findMany({
      where: {
        type: 'private',
      },
      include: {
        participants: true,
      },
    });

    let conversation = conversations.find((conv) => {
      const userIds = conv.participants.map((p) => p.user_id).sort();
      return (
        userIds.length === 2 &&
        userIds[0] === participants[0] &&
        userIds[1] === participants[1]
      );
    });

    // Create conversation if not exists
    if (!conversation) {
      conversation = await this.prisma.conversations.create({
        data: {
          type: 'private',
          participants: {
            create: [
              { user_id: userId, entity_type: 'user' },
              { user_id: story.user_id, entity_type: 'user' },
            ],
          },
        },
        include: {
          participants: true,
        },
      });
    }

    // Create message with story card attachment
    const message = await this.prisma.messages.create({
      data: {
        conversation_id: conversation.id,
        sender_id: userId,
        sender_type: 'user',
        content: replyDto.content,
        type: 'STORY_REPLY', // Special message type for story replies
        payload: {
          story_id: storyId,
          story_type: story.story_type,
          story_media_url: story.media_url,
          story_thumbnail_url: story.thumbnail_url,
          story_caption: story.caption,
          story_owner: {
            id: story.user.id,
            full_name: story.user.full_name,
            avatar_url: story.user.avatar_url,
          },
          story_created_at: story.created_at,
          story_expires_at: story.expires_at,
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
    });

    // ✅ Emit socket event to both users
    const formattedMessage = {
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      senderType: message.sender_type,
      receiverId: story.user_id,
      content: message.content,
      type: message.type,
      messageType: message.type,
      payload: message.payload,
      createdAt: message.created_at.toISOString(),
      sender: message.sender ? {
        id: message.sender.id,
        fullName: message.sender.full_name,
        avatarUrl: message.sender.avatar_url,
      } : null,
    };

    // Emit to both sender and receiver
    this.chatGateway.server.to(`${userId}`).emit('newMessage', formattedMessage);
    this.chatGateway.server.to(`${story.user_id}`).emit('newMessage', formattedMessage);

    return {
      success: true,
      data: {
        message,
        conversation_id: conversation.id,
      },
      message: 'Reply sent as direct message successfully',
    };
  }

  /**
   * Get viewers list for a story (only story owner can see)
   */
  async getViewers(storyId: number, userId: number) {
    const story = await this.prisma.posts.findFirst({
      where: {
        id: storyId,
        is_story: true,
      },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.user_id !== userId) {
      throw new ForbiddenException('Only story owner can see viewers');
    }

    const viewers = await this.prisma.story_views.findMany({
      where: {
        post_id: storyId,
      },
      include: {
        viewer: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        viewed_at: 'desc',
      },
    });

    return {
      success: true,
      data: viewers,
      total: viewers.length,
    };
  }

  /**
   * Clean up expired stories (cron job)
   */
  async cleanupExpiredStories() {
    const deleted = await this.prisma.posts.deleteMany({
      where: {
        is_story: true,
        expires_at: {
          lt: new Date(),
        },
      },
    });

    return deleted.count;
  }
}
