import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryPostsDto } from './dto/query-posts.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async createPost(userId: number, createPostDto: CreatePostDto) {
    const { media_urls, product_ids, tags, ...postData } = createPostDto;

    // Tạo post
    const post = await this.prisma.posts.create({
      data: {
        ...postData,
        user_id: userId,
        moderation_status: 'pending',
      },
    });

    // Thêm media nếu có
    if (media_urls && media_urls.length > 0) {
      await this.prisma.post_media.createMany({
        data: media_urls.map((url, index) => ({
          post_id: post.id,
          media_url: url,
          media_type: url.includes('.mp4') || url.includes('.mov') ? 'video' : 'image',
          sort_order: index,
        })),
      });
    }

    // Thêm products nếu có
    if (product_ids && product_ids.length > 0) {
      await this.prisma.post_products.createMany({
        data: product_ids.map(productId => ({
          post_id: post.id,
          product_id: productId,
        })),
      });
    }

    // Thêm tags nếu có
    if (tags && tags.length > 0) {
      // Tạo hoặc tìm tags
      for (const tagName of tags) {
        const slug = tagName.toLowerCase().replace(/\s+/g, '-');
        let tag = await this.prisma.tags.findUnique({
          where: { slug },
        });

        if (!tag) {
          tag = await this.prisma.tags.create({
            data: { name: tagName, slug },
          });
        }

        await this.prisma.post_tags.create({
          data: {
            post_id: post.id,
            tag_id: tag.id,
          },
        });
      }
    }

    return this.getPostById(post.id);
  }

  async getPosts(queryDto: QueryPostsDto) {
    const { page = 1, limit = 10, user_id, shop_id, post_type, visibility, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      moderation_status: 'approved',
    };

    if (user_id) where.user_id = user_id;
    if (shop_id) where.shop_id = shop_id;
    if (post_type) where.post_type = post_type;
    if (visibility) where.visibility = visibility;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content_md: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.posts.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            },
          },
          shop: {
            select: {
              id: true,
              name: true,
              logo_url: true,
            },
          },
          post_media: {
            orderBy: { sort_order: 'asc' },
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
          post_tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },

        },
      }),
      this.prisma.posts.count({ where }),
    ]);

    // Thêm likes và comments count cho mỗi post
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const [likesCount, commentsCount] = await Promise.all([
          this.prisma.likes.count({
            where: { target_type: 'post', target_id: post.id },
          }),
          this.prisma.comments.count({
            where: { target_type: 'post', target_id: post.id },
          }),
        ]);

        return {
          ...post,
          likes_count: likesCount,
          comments_count: commentsCount,
        };
      })
    );

    return {
      data: postsWithCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getPostById(id: number) {
    const post = await this.prisma.posts.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },
        post_media: {
          orderBy: { sort_order: 'asc' },
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
        post_tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },

      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Tăng view count
    await this.prisma.posts.update({
      where: { id },
      data: { view_count: { increment: 1 } },
    });

    // Thêm likes và comments count
    const [likesCount, commentsCount] = await Promise.all([
      this.prisma.likes.count({
        where: { target_type: 'post', target_id: id },
      }),
      this.prisma.comments.count({
        where: { target_type: 'post', target_id: id },
      }),
    ]);

    return {
      ...post,
      likes_count: likesCount,
      comments_count: commentsCount,
    };
  }

  async updatePost(id: number, userId: number, updatePostDto: UpdatePostDto) {
    const post = await this.prisma.posts.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.user_id !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const { media_urls, product_ids, tags, ...postData } = updatePostDto;

    // Cập nhật post
    const updatedPost = await this.prisma.posts.update({
      where: { id },
      data: {
        ...postData,
        updated_at: new Date(),
      },
    });

    // Xử lý media nếu có
    if (media_urls !== undefined) {
      // Xóa media cũ
      await this.prisma.post_media.deleteMany({
        where: { post_id: id },
      });

      // Thêm media mới
      if (media_urls.length > 0) {
        await this.prisma.post_media.createMany({
          data: media_urls.map((url, index) => ({
            post_id: id,
            media_url: url,
            media_type: url.includes('.mp4') || url.includes('.mov') ? 'video' : 'image',
            sort_order: index,
          })),
        });
      }
    }

    // Xử lý products nếu có
    if (product_ids !== undefined) {
      // Xóa products cũ
      await this.prisma.post_products.deleteMany({
        where: { post_id: id },
      });

      // Thêm products mới
      if (product_ids.length > 0) {
        await this.prisma.post_products.createMany({
          data: product_ids.map(productId => ({
            post_id: id,
            product_id: productId,
          })),
        });
      }
    }

    // Xử lý tags nếu có
    if (tags !== undefined) {
      // Xóa tags cũ
      await this.prisma.post_tags.deleteMany({
        where: { post_id: id },
      });

      // Thêm tags mới
      if (tags.length > 0) {
        for (const tagName of tags) {
          const slug = tagName.toLowerCase().replace(/\s+/g, '-');
          let tag = await this.prisma.tags.findUnique({
            where: { slug },
          });

          if (!tag) {
            tag = await this.prisma.tags.create({
              data: { name: tagName, slug },
            });
          }

          await this.prisma.post_tags.create({
            data: {
              post_id: id,
              tag_id: tag.id,
            },
          });
        }
      }
    }

    return this.getPostById(id);
  }

  async deletePost(id: number, userId: number) {
    const post = await this.prisma.posts.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Xóa các dữ liệu liên quan
    await Promise.all([
      this.prisma.post_media.deleteMany({ where: { post_id: id } }),
      this.prisma.post_products.deleteMany({ where: { post_id: id } }),
      this.prisma.post_tags.deleteMany({ where: { post_id: id } }),
      this.prisma.likes.deleteMany({ where: { target_type: 'post', target_id: id } }),
      this.prisma.comments.deleteMany({ where: { target_type: 'post', target_id: id } }),
    ]);

    // Xóa post
    await this.prisma.posts.delete({
      where: { id },
    });

    return { message: 'Post deleted successfully' };
  }

  async likePost(postId: number, userId: number) {
    // Kiểm tra post có tồn tại không
    const post = await this.prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Kiểm tra đã like chưa
    const existingLike = await this.prisma.likes.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: 'post',
          target_id: postId,
        },
      },
    });

    if (existingLike) {
      throw new ForbiddenException('You already liked this post');
    }

    // Tạo like
    await this.prisma.likes.create({
      data: {
        user_id: userId,
        target_type: 'post',
        target_id: postId,
      },
    });

    // Cập nhật like count
    await this.prisma.posts.update({
      where: { id: postId },
      data: { like_count: { increment: 1 } },
    });

    return { message: 'Post liked successfully' };
  }

  async unlikePost(postId: number, userId: number) {
    // Kiểm tra post có tồn tại không
    const post = await this.prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Tìm like
    const like = await this.prisma.likes.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: 'post',
          target_id: postId,
        },
      },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    // Xóa like
    await this.prisma.likes.delete({
      where: { id: like.id },
    });

    // Cập nhật like count
    await this.prisma.posts.update({
      where: { id: postId },
      data: { like_count: { decrement: 1 } },
    });

    return { message: 'Post unliked successfully' };
  }

  async addComment(postId: number, userId: number, createCommentDto: CreateCommentDto) {
    // Kiểm tra post có tồn tại không
    const post = await this.prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Tạo comment
    const comment = await this.prisma.comments.create({
      data: {
        ...createCommentDto,
        user_id: userId,
        target_type: 'post',
        target_id: postId,
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

    return comment;
  }

  async getComments(postId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comments.findMany({
        where: {
          target_type: 'post',
          target_id: postId,
          parent_id: null, // Chỉ lấy comment gốc
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            },
          },
        },
      }),
      this.prisma.comments.count({
        where: {
          target_type: 'post',
          target_id: postId,
          parent_id: null,
        },
      }),
    ]);

    // Thêm likes count cho mỗi comment
    const commentsWithLikes = await Promise.all(
      comments.map(async (comment) => {
        const likesCount = await this.prisma.likes.count({
          where: { target_type: 'comment', target_id: comment.id },
        });

        return {
          ...comment,
          likes_count: likesCount,
        };
      })
    );

    return {
      data: commentsWithLikes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async deleteComment(commentId: number, userId: number) {
    const comment = await this.prisma.comments.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comments.delete({
      where: { id: commentId },
    });

    return { message: 'Comment deleted successfully' };
  }

  async likeComment(commentId: number, userId: number) {
    // Kiểm tra comment có tồn tại không
    const comment = await this.prisma.comments.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Kiểm tra đã like chưa
    const existingLike = await this.prisma.likes.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: 'comment',
          target_id: commentId,
        },
      },
    });

    if (existingLike) {
      throw new ForbiddenException('You already liked this comment');
    }

    // Tạo like
    await this.prisma.likes.create({
      data: {
        user_id: userId,
        target_type: 'comment',
        target_id: commentId,
      },
    });

    return { message: 'Comment liked successfully' };
  }

  async unlikeComment(commentId: number, userId: number) {
    // Kiểm tra comment có tồn tại không
    const comment = await this.prisma.comments.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Tìm like
    const like = await this.prisma.likes.findUnique({
      where: {
        user_id_target_type_target_id: {
          user_id: userId,
          target_type: 'comment',
          target_id: commentId,
        },
      },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    // Xóa like
    await this.prisma.likes.delete({
      where: { id: like.id },
    });

    return { message: 'Comment unliked successfully' };
  }

  async getCommentLikes(commentId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // Kiểm tra comment có tồn tại không
    const comment = await this.prisma.comments.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const [likes, total] = await Promise.all([
      this.prisma.likes.findMany({
        where: {
          target_type: 'comment',
          target_id: commentId,
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            },
          },
        },
      }),
      this.prisma.likes.count({
        where: {
          target_type: 'comment',
          target_id: commentId,
        },
      }),
    ]);

    return {
      data: likes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
