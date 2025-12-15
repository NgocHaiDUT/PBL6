import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { QueryLikesDto } from './dto/query-likes.dto';
import {
  LikeResponse,
  LikeStatsResponse,
  PaginatedLikesResponse,
} from './interfaces/like.interface';
import { NotificationHelperService } from '../notifications/notification-helper.service';

@Injectable()
export class LikesService {
  constructor(
    private prisma: PrismaService,
    private notificationHelper: NotificationHelperService
  ) { }

  async create(
    createLikeDto: CreateLikeDto,
    userId: number,
  ): Promise<LikeResponse> {
    // Verify target exists based on target_type
    await this.verifyTargetExists(
      createLikeDto.target_type,
      createLikeDto.target_id,
    );

    // Check if user already liked this target
    const existingLike = await this.prisma.likes.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: createLikeDto.target_type,
          target_id: createLikeDto.target_id,
        },
      },
    });

    if (existingLike) {
      throw new ConflictException('User has already liked this item');
    }

    const like = await this.prisma.likes.create({
      data: {
        ...createLikeDto,
        user_id: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });

    // Update like count for posts
    if (createLikeDto.target_type === 'post') {
      await this.updatePostLikeCount(createLikeDto.target_id);
    }

    return like;
  }

  async getTotalLikesByUser(userId: number): Promise<{ total_likes: number }> {
    // 1. Lấy tất cả post của user (exclude stories)
    const userPosts = await this.prisma.posts.findMany({
      where: { 
        user_id: userId,
        is_story: false, // Exclude stories from like count
      },
      select: { id: true }
    });

    // 2. Đếm like trên các post đó
    const postLikeCount = await this.prisma.likes.count({
      where: {
        target_type: 'post',
        target_id: { in: userPosts.map(p => p.id) }
      }
    });

    const total_likes = postLikeCount;

    return { total_likes };
  }

  async findAll(queryDto: QueryLikesDto): Promise<PaginatedLikesResponse> {
    const { target_type, target_id, user_id, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (target_type) where.target_type = target_type;
    if (target_id) where.target_id = target_id;
    if (user_id) where.user_id = user_id;

    const [likes, total] = await Promise.all([
      this.prisma.likes.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              email: true,
              avatar_url: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.likes.count({ where }),
    ]);

    return {
      data: likes,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<LikeResponse> {
    const like = await this.prisma.likes.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    return like;
  }

  async remove(
    targetType: string,
    targetId: number,
    userId: number,
  ): Promise<void> {
    const existingLike = await this.prisma.likes.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: targetType,
          target_id: targetId,
        },
      },
    });

    if (!existingLike) {
      throw new NotFoundException('Like not found');
    }

    await this.prisma.likes.delete({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: targetType,
          target_id: targetId,
        },
      },
    });

    // Update like count for posts
    if (targetType === 'post') {
      await this.updatePostLikeCount(targetId);
    }
  }

  async getStats(
    targetType: string,
    targetId: number,
    userId?: number,
  ): Promise<LikeStatsResponse> {
    const total_likes = await this.prisma.likes.count({
      where: {
        target_type: targetType,
        target_id: targetId,
      },
    });

    let user_liked = false;
    if (userId) {
      const userLike = await this.prisma.likes.findUnique({
        where: {
          user_id_target_type_target_id: {
            user_id: userId,
            target_type: targetType,
            target_id: targetId,
          },
        },
      });
      user_liked = !!userLike;
    }

    return {
      target_type: targetType,
      target_id: targetId,
      total_likes,
      user_liked,
    };
  }

  async toggleLike(
    targetType: string,
    targetId: number,
    userId: number,
  ): Promise<{ liked: boolean; total_likes: number }> {
    // Verify target exists
    await this.verifyTargetExists(targetType, targetId);

    const existingLike = await this.prisma.likes.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: targetType,
          target_id: targetId,
        },
      },
    });

    let liked: boolean;

    if (existingLike) {
      // Unlike
      await this.prisma.likes.delete({
        where: {
          user_id_target_type_target_id: {
            user_id: userId,
            target_type: targetType,
            target_id: targetId,
          },
        },
      });
      liked = false;
    } else {
      // Like
      await this.prisma.likes.create({
        data: {
          user_id: userId,
          target_type: targetType,
          target_id: targetId,
        },
      });
      liked = true;
    }

    // Update like count for posts
    if (targetType === 'post') {
      await this.updatePostLikeCount(targetId);
    }

    // Send notification for likes (not unlikes)
    if (liked) {
      if (targetType === 'post') {
        await this.notificationHelper.handlePostLike(targetId, userId, liked);
      } else if (targetType === 'comment') {
        await this.notificationHelper.handleCommentLike(
          targetId,
          userId,
          liked,
        );
      }
    }

    // Get updated total likes
    const total_likes = await this.prisma.likes.count({
      where: {
        target_type: targetType,
        target_id: targetId,
      },
    });

    return { liked, total_likes };
  }

  private async verifyTargetExists(
    targetType: string,
    targetId: number,
  ): Promise<void> {
    switch (targetType) {
      case 'post':
        const post = await this.prisma.posts.findUnique({
          where: { id: targetId },
        });
        if (!post) {
          throw new NotFoundException('Post not found');
        }
        break;
      case 'product':
        const product = await this.prisma.products.findUnique({
          where: { id: targetId },
        });
        if (!product) {
          throw new NotFoundException('Product not found');
        }
        break;
      case 'comment':
        const comment = await this.prisma.comments.findUnique({
          where: { id: targetId },
        });
        if (!comment) {
          throw new NotFoundException('Comment not found');
        }
        break;
      default:
        throw new NotFoundException('Invalid target type');
    }
  }

  private async updatePostLikeCount(postId: number): Promise<void> {
    const likeCount = await this.prisma.likes.count({
      where: {
        target_type: 'post',
        target_id: postId,
      },
    });

    await this.prisma.posts.update({
      where: { id: postId },
      data: { like_count: likeCount },
    });
  }
}
