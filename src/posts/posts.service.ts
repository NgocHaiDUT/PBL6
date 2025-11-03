import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

import { QueryPostsDto } from './dto/query-posts.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  // Helper function to normalize URLs for frontend
  private normalizeUrl(url: string | null): string | null {
    if (!url) return null;
    // If already absolute URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // For relative paths, they will be prefixed with API_BASE_URL on frontend
    return url;
  }

  // Helper function to normalize post object URLs
  private normalizePostUrls(post: any): any {
    // Process post_media and extract cover/video URLs
    const processedMedia = post.post_media ? post.post_media.map((media: any) => ({
      ...media,
      media_url: this.normalizeUrl(media.media_url)
    })) : [];

    // Find cover image (sort_order: 0) and first video
    const coverImage = processedMedia.find(media => media.sort_order === 0 && media.media_type === 'image');
    const firstVideo = processedMedia.find(media => media.media_type === 'video');

    return {
      ...post,
      // Provide backward compatibility fields
      cover_url: coverImage ? coverImage.media_url : null,
      video_url: firstVideo ? firstVideo.media_url : null,
      user: post.user ? {
        ...post.user,
        avatar_url: this.normalizeUrl(post.user.avatar_url)
      } : null,
      shop: post.shop ? {
        ...post.shop,
        logo_url: this.normalizeUrl(post.shop.logo_url)
      } : null,
      post_media: processedMedia
    };
  }

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

    const createdPost = await this.getPostById(post.id);
    return {
      success: true,
      message: 'Post created successfully',
      data: createdPost.data
    };
  }

  async getPosts(queryDto: QueryPostsDto) {
    const { page = 1, limit = 10, user_id, shop_id, post_type, visibility, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      // moderation_status: 'approved', // Temporary comment for testing
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

    // Add like count and comment count for each post
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const [likeCount, commentCount] = await Promise.all([
          this.prisma.likes.count({
            where: {
              target_type: 'post',
              target_id: post.id,
            },
          }),
          this.prisma.comments.count({
            where: {
              target_type: 'post',
              target_id: post.id,
            },
          }),
        ]);

        return {
          ...post,
          like_count: likeCount,
          comment_count: commentCount,
        };
      })
    );

    // Normalize post URLs
    const normalizedPosts = postsWithCounts.map(post => this.normalizePostUrls(post));

    return {
      success: true,
      data: normalizedPosts,
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

    const normalizedPost = this.normalizePostUrls(post);

    return {
      success: true,
      data: normalizedPost
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



  // Upload cover image for post
  async uploadCoverImage(postId: number, userId: number, file: any) {
    // Verify post exists and user owns it
    const post = await this.prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.user_id !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const coverUrl = file.location || `/uploads/postimages/${file.filename}`;
    
    // Create or update cover image in post_media table
    const existingCover = await this.prisma.post_media.findFirst({
      where: { 
        post_id: postId,
        sort_order: 0
      },
    });

    if (existingCover) {
      // Update existing cover
      await this.prisma.post_media.update({
        where: { id: existingCover.id },
        data: { 
          media_url: coverUrl,
          media_type: 'image'
        },
      });
    } else {
      // Create new cover media
      await this.prisma.post_media.create({
        data: {
          post_id: postId,
          media_url: coverUrl,
          media_type: 'image',
          sort_order: 0,
        },
      });
    }

    return {
      success: true,
      message: 'Cover image uploaded successfully',
      data: { cover_url: coverUrl },
    };
  }

  // Upload video for post
  async uploadVideo(postId: number, userId: number, file: any) {
    // Verify post exists and user owns it
    const post = await this.prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.user_id !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    const videoUrl = file.location || `/uploads/videos/${file.filename}`;
    
    // Get current max sort_order for this post
    const maxSortOrder = await this.prisma.post_media.findFirst({
      where: { post_id: postId },
      orderBy: { sort_order: 'desc' },
      select: { sort_order: true },
    });

    const nextOrder = (maxSortOrder?.sort_order || -1) + 1;
    
    // Create video media record
    await this.prisma.post_media.create({
      data: {
        post_id: postId,
        media_url: videoUrl,
        media_type: 'video',
        sort_order: nextOrder,
      },
    });

    return {
      success: true,
      message: 'Video uploaded successfully',
      data: { video_url: videoUrl },
    };
  }

  // Upload additional media (images/videos)
  async uploadAdditionalMedia(postId: number, userId: number, files: any[]) {
    // Verify post exists and user owns it
    const post = await this.prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.user_id !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    // Get current max sort_order
    const maxSortOrder = await this.prisma.post_media.findFirst({
      where: { post_id: postId },
      orderBy: { sort_order: 'desc' },
      select: { sort_order: true },
    });

    const startOrder = (maxSortOrder?.sort_order || -1) + 1;

    // Create media records using actual file paths
    const mediaData = files.map((file, index) => {
      const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      const directory = mediaType === 'video' ? 'videos' : 'postimages';
      const mediaUrl = file.location || `/uploads/${directory}/${file.filename}`;
      
      return {
        post_id: postId,
        media_url: mediaUrl,
        media_type: mediaType,
        sort_order: startOrder + index,
      };
    });

    const createdMedia = await this.prisma.post_media.createMany({
      data: mediaData,
    });

    return {
      success: true,
      message: `${files.length} media files uploaded successfully`,
      data: { count: createdMedia.count, media: mediaData },
    };
  }

  // Delete media from post
  async deleteMedia(mediaId: number, userId: number) {
    // Find media and verify ownership
    const media = await this.prisma.post_media.findUnique({
      where: { id: mediaId },
      include: {
        post: {
          select: { user_id: true },
        },
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.post.user_id !== userId) {
      throw new ForbiddenException('You can only delete media from your own posts');
    }

    // Delete media record
    await this.prisma.post_media.delete({
      where: { id: mediaId },
    });

    // TODO: Delete actual file from storage

    return {
      success: true,
      message: 'Media deleted successfully',
    };
  }
}
