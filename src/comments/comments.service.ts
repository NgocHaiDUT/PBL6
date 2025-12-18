import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import {
  CommentResponse,
  PaginatedCommentsResponse,
} from './interfaces/comment.interface';
import { NotificationHelperService } from '../notifications/notification-helper.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationHelper: NotificationHelperService,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
    userId: number,
  ): Promise<CommentResponse> {
    // Verify target exists based on target_type
    if (createCommentDto.target_type === 'post') {
      const post = await this.prisma.posts.findUnique({
        where: { id: createCommentDto.target_id },
      });
      if (!post) {
        throw new NotFoundException('Post not found');
      }
    }

    // If parent_id is provided, verify the parent comment exists and belongs to the same target
    if (createCommentDto.parent_id) {
      const parentComment = await this.prisma.comments.findUnique({
        where: { id: createCommentDto.parent_id },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (
        parentComment.target_type !== createCommentDto.target_type ||
        parentComment.target_id !== createCommentDto.target_id
      ) {
        throw new ForbiddenException(
          'Parent comment does not belong to the same target',
        );
      }
    }

    const comment = await this.prisma.comments.create({
      data: {
        ...createCommentDto,
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

    // Send notification for comment
    await this.notificationHelper.handleComment(createCommentDto, userId);

    return comment;
  }

  async findAllFlat(targetId: number) {
    const comments = await this.prisma.comments.findMany({
      where: { target_id: targetId },
    });

    return comments;
  }

  async findAll(
    queryDto: QueryCommentsDto,
  ): Promise<PaginatedCommentsResponse> {
    const {
      target_type,
      target_id,
      parent_id,
      page = 1,
      limit = 20,
      include_replies,
      user_id,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where = {
      target_type,
      target_id,
      parent_id: parent_id || null,
    };

    // Nếu include_replies=true, chỉ lấy comments cấp 1 (parent_id = null)
    if (include_replies) {
      where.parent_id = null;
    }

    const [comments, total] = await Promise.all([
      this.prisma.comments.findMany({
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
          // Nếu include_replies=true, lấy tất cả replies đệ quy
          ...(include_replies
            ? {
                replies: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        full_name: true,
                        email: true,
                        avatar_url: true,
                      },
                    },
                    replies: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            full_name: true,
                            email: true,
                            avatar_url: true,
                          },
                        },
                        replies: {
                          include: {
                            user: {
                              select: {
                                id: true,
                                full_name: true,
                                email: true,
                                avatar_url: true,
                              },
                            },
                            replies: true, // Hỗ trợ tối đa 4 cấp
                          },
                          orderBy: { created_at: 'asc' },
                        },
                      },
                      orderBy: { created_at: 'asc' },
                    },
                  },
                  orderBy: { created_at: 'asc' },
                },
              }
            : {}),
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.comments.count({ where }),
    ]);

    // Helper function to add like stats to a comment recursively
    const addLikeStats = async (comment: any): Promise<any> => {
      // Get like count and user like status for this comment
      const [likes_count, is_liked] = await Promise.all([
        this.prisma.likes.count({
          where: { target_type: 'comment', target_id: comment.id },
        }),
        user_id
          ? this.prisma.likes
              .findUnique({
                where: {
                  user_id_target_type_target_id: {
                    user_id: user_id,
                    target_type: 'comment',
                    target_id: comment.id,
                  },
                },
              })
              .then((like) => !!like)
          : false,
      ]);

      const commentWithStats = {
        ...comment,
        likes_count,
        is_liked,
      };

      // If comment has replies, recursively add stats to them
      if (comment.replies && comment.replies.length > 0) {
        commentWithStats.replies = await Promise.all(
          comment.replies.map((reply) => addLikeStats(reply)),
        );
      }

      return commentWithStats;
    };

    // Add like stats to comments
    const commentsWithStats = await Promise.all(
      comments.map((comment) => addLikeStats(comment)),
    );

    // Nếu không include_replies, thêm replies_count
    if (!include_replies) {
      const commentsWithCount = await Promise.all(
        commentsWithStats.map(async (comment) => {
          const replies_count = await this.prisma.comments.count({
            where: { parent_id: comment.id },
          });
          return {
            ...comment,
            replies_count,
          };
        }),
      );

      return {
        data: commentsWithCount,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      };
    }

    // Nếu include_replies=true, replies đã được load sẵn
    return {
      data: commentsWithStats,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<CommentResponse> {
    const comment = await this.prisma.comments.findUnique({
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

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Get replies separately
    const replies = await this.prisma.comments.findMany({
      where: { parent_id: id },
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
        created_at: 'asc',
      },
    });

    return {
      ...comment,
      replies,
    };
  }

  async update(
    id: number,
    updateCommentDto: UpdateCommentDto,
    userId: number,
  ): Promise<CommentResponse> {
    const existingComment = await this.prisma.comments.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.user_id !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    const updatedComment = await this.prisma.comments.update({
      where: { id },
      data: updateCommentDto,
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

    return updatedComment;
  }

  async remove(id: number, userId: number): Promise<void> {
    const existingComment = await this.prisma.comments.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Delete all replies first (cascade delete)
    await this.prisma.comments.deleteMany({
      where: { parent_id: id },
    });

    // Delete the comment itself
    await this.prisma.comments.delete({
      where: { id },
    });
  }

  async getReplies(commentId: number): Promise<CommentResponse[]> {
    const parentComment = await this.prisma.comments.findUnique({
      where: { id: commentId },
    });

    if (!parentComment) {
      throw new NotFoundException('Comment not found');
    }

    const replies = await this.prisma.comments.findMany({
      where: { parent_id: commentId },
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
        created_at: 'asc',
      },
    });

    return replies;
  }

  // Helper method để tạo test data - có thể xóa sau
  async createTestCommentsForPost(postId: number): Promise<void> {

    // Tạo comment cấp 1
    const rootComment = await this.prisma.comments.create({
      data: {
        user_id: 1,
        target_type: 'post',
        target_id: postId,
        content: 'Đây là comment cấp 1 đầu tiên',
      },
    });

    // Tạo reply cấp 2
    const level2Reply = await this.prisma.comments.create({
      data: {
        user_id: 1,
        target_type: 'post',
        target_id: postId,
        content: 'Đây là reply cấp 2',
        parent_id: rootComment.id,
      },
    });

    // Tạo reply cấp 3
    await this.prisma.comments.create({
      data: {
        user_id: 1,
        target_type: 'post',
        target_id: postId,
        content: 'Đây là reply cấp 3',
        parent_id: level2Reply.id,
      },
    });

    // Tạo thêm comment cấp 1 khác
    const rootComment2 = await this.prisma.comments.create({
      data: {
        user_id: 1,
        target_type: 'post',
        target_id: postId,
        content: 'Đây là comment cấp 1 thứ hai',
      },
    });

    // Tạo nhiều replies cho comment thứ 2
    await this.prisma.comments.create({
      data: {
        user_id: 1,
        target_type: 'post',
        target_id: postId,
        content: 'Reply đầu tiên cho comment thứ 2',
        parent_id: rootComment2.id,
      },
    });

    await this.prisma.comments.create({
      data: {
        user_id: 1,
        target_type: 'post',
        target_id: postId,
        content: 'Reply thứ hai cho comment thứ 2',
        parent_id: rootComment2.id,
      },
    });
  }
}
