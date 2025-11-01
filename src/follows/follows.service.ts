import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowDto } from './dto/create-follow.dto';
import { QueryFollowsDto } from './dto/query-follows.dto';
import { FollowResponse, FollowStatsResponse, PaginatedFollowsResponse } from './interfaces/follow.interface';
import { NotificationHelperService } from '../notifications/notification-helper.service';

@Injectable()
export class FollowsService {
  constructor(
    private prisma: PrismaService,
    private notificationHelper: NotificationHelperService
  ) {}

  async create(createFollowDto: CreateFollowDto, followerId: number): Promise<FollowResponse> {
    const { following_id } = createFollowDto;

    // Prevent self-following
    if (followerId === following_id) {
      throw new ForbiddenException('Cannot follow yourself');
    }

    // Check if target user exists
    const targetUser = await this.prisma.users.findUnique({
      where: { id: following_id }
    });

    if (!targetUser) {
      throw new NotFoundException('User to follow not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follows.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: following_id
        }
      }
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    // Create follow relationship
    const follow = await this.prisma.follows.create({
      data: {
        follower_id: followerId,
        following_id: following_id
      },
      include: {
        follower: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true
          }
        },
        following: {
          select: {
            id: true,
            full_name: true,
            email: true,
            avatar_url: true
          }
        }
      }
    });

    return follow;
  }

  async findAll(queryDto: QueryFollowsDto): Promise<PaginatedFollowsResponse> {
    const { user_id, type, page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    let where: any = {};

    if (user_id && type === 'followers') {
      // Get users who follow the specified user
      where.following_id = user_id;
    } else if (user_id && type === 'following') {
      // Get users that the specified user follows
      where.follower_id = user_id;
    } else if (user_id) {
      // Default to followers if type not specified
      where.following_id = user_id;
    }

    const [follows, total] = await Promise.all([
      this.prisma.follows.findMany({
        where,
        include: {
          follower: {
            select: {
              id: true,
              full_name: true,
              email: true,
              avatar_url: true
            }
          },
          following: {
            select: {
              id: true,
              full_name: true,
              email: true,
              avatar_url: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit
      }),
      this.prisma.follows.count({ where })
    ]);

    return {
      data: follows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    };
  }

  async remove(followingId: number, followerId: number): Promise<void> {
    // Check if follow relationship exists
    const existingFollow = await this.prisma.follows.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId
        }
      }
    });

    if (!existingFollow) {
      throw new NotFoundException('Follow relationship not found');
    }

    // Remove follow relationship
    await this.prisma.follows.delete({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId
        }
      }
    });
  }

  async getStats(userId: number, currentUserId?: number): Promise<FollowStatsResponse> {
    // Check if user exists
    const user = await this.prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [followersCount, followingCount, isFollowing] = await Promise.all([
      // Count followers
      this.prisma.follows.count({
        where: { following_id: userId }
      }),
      // Count following
      this.prisma.follows.count({
        where: { follower_id: userId }
      }),
      // Check if current user follows this user
      currentUserId && currentUserId !== userId ? 
        this.prisma.follows.findUnique({
          where: {
            follower_id_following_id: {
              follower_id: currentUserId,
              following_id: userId
            }
          }
        }).then(follow => !!follow) : 
        Promise.resolve(false)
    ]);

    return {
      user_id: userId,
      followers_count: followersCount,
      following_count: followingCount,
      ...(currentUserId && currentUserId !== userId && { is_following: isFollowing })
    };
  }

  async toggleFollow(followingId: number, followerId: number): Promise<{ following: boolean; followers_count: number }> {
    // Prevent self-following
    if (followerId === followingId) {
      throw new ForbiddenException('Cannot follow yourself');
    }

    // Check if target user exists
    const targetUser = await this.prisma.users.findUnique({
      where: { id: followingId }
    });

    if (!targetUser) {
      throw new NotFoundException('User to follow not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follows.findUnique({
      where: {
        follower_id_following_id: {
          follower_id: followerId,
          following_id: followingId
        }
      }
    });

    const isFollowing = !existingFollow;

    if (existingFollow) {
      // Unfollow
      await this.prisma.follows.delete({
        where: {
          follower_id_following_id: {
            follower_id: followerId,
            following_id: followingId
          }
        }
      });
    } else {
      // Follow
      await this.prisma.follows.create({
        data: {
          follower_id: followerId,
          following_id: followingId
        }
      });
    }

    // Send notification for follows (not unfollows)
    await this.notificationHelper.handleFollow(followingId, followerId, isFollowing);

    // Get updated followers count
    const followersCount = await this.prisma.follows.count({
      where: { following_id: followingId }
    });

    return {
      following: isFollowing,
      followers_count: followersCount
    };
  }

  async getMutualFriends(userId: number, page: number = 1, limit: number = 20): Promise<any> {
    try {
      console.log('👥 [Service] Getting mutual friends for userId:', userId, 'page:', page, 'limit:', limit);

      // Get users who both follow the user AND are followed by the user
      const mutualFriends = await this.prisma.$queryRaw`
        SELECT DISTINCT 
          u.id,
          u.full_name,
          u.avatar_url
        FROM users u
        INNER JOIN follows f1 ON u.id = f1.follower_id
        INNER JOIN follows f2 ON u.id = f2.following_id
        WHERE f1.following_id = ${userId}
          AND f2.follower_id = ${userId}
          AND u.id != ${userId}
        ORDER BY u.full_name
        LIMIT ${limit}
        OFFSET ${(page - 1) * limit}
      `;

      // Get total count for pagination
      const totalResult: any = await this.prisma.$queryRaw`
        SELECT COUNT(DISTINCT u.id) as total
        FROM users u
        INNER JOIN follows f1 ON u.id = f1.follower_id
        INNER JOIN follows f2 ON u.id = f2.following_id
        WHERE f1.following_id = ${userId}
          AND f2.follower_id = ${userId}
          AND u.id != ${userId}
      `;

      const total = Number(totalResult[0]?.total || 0);
      const totalPages = Math.ceil(total / limit);
      const friends: any = mutualFriends;

      console.log('👥 [Service] Found', friends.length, 'mutual friends out of', total, 'total');

      return {
        data: friends,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages
        }
      };
    } catch (error) {
      console.error('❌ [Service] Error getting mutual friends:', error);
      throw error;
    }
  }
}