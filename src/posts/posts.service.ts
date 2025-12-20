import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { getPostFileUrl } from './config/s3-post.config';

import { QueryPostsDto } from './dto/query-posts.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) { }

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
    const processedMedia = post.post_media
      ? post.post_media.map((media: any) => ({
        ...media,
        media_url: this.normalizeUrl(media.media_url),
      }))
      : [];

    // Find cover image (sort_order: 0) and first video
    const coverImage = processedMedia.find(
      (media) => media.sort_order === 0 && media.media_type === 'image',
    );
    const firstVideo = processedMedia.find(
      (media) => media.media_type === 'video',
    );

    return {
      ...post,
      // Provide backward compatibility fields
      cover_url: coverImage ? coverImage.media_url : null,
      video_url: firstVideo ? firstVideo.media_url : null,
      user: post.user
        ? {
          ...post.user,
          avatar_url: this.normalizeUrl(post.user.avatar_url),
        }
        : null,
      shop: post.shop
        ? {
          ...post.shop,
          logo_url: this.normalizeUrl(post.shop.logo_url),
        }
        : null,
      // Process products to add first image if available
      post_products: post.post_products
        ? post.post_products.map((pp: any) => ({
          ...pp,
          product: {
            ...pp.product,
            image: pp.product.product_media?.[0]?.url
              ? this.normalizeUrl(pp.product.product_media[0].url)
              : null,
            hasTryOn: pp.product.product_variants?.some(
              (v: any) => v.shade_hex !== null && v.shade_hex !== '',
            ) || false,
          }
        }))
        : [],
      post_media: processedMedia,
    };
  }

  async createPost(userId: number, createPostDto: CreatePostDto, files: any[]) {
    const { product_ids, tags, ...postData } = createPostDto;

    // Allow empty content_md only when there is at least one media file
    const rawMd = (postData as any)?.content_md as string | undefined;
    const trimmedMd = typeof rawMd === 'string' ? rawMd.trim() : '';
    const hasMedia = Array.isArray(files) && files.length > 0;
    if (!trimmedMd && !hasMedia) {
      throw new Error('content_md is required when no media is provided');
    }

    // Remove undefined fields to avoid Prisma receiving undefined
    const sanitizedBase = Object.fromEntries(
      Object.entries({
        ...postData,
        // enforce defaults and normalized md
        post_type: (postData as any)?.post_type ?? 'post',
        visibility: (postData as any)?.visibility ?? 'public',
        content_md: trimmedMd,
      }).filter(([, v]) => v !== undefined),
    );

    // 1. Create the post record
    const post = await this.prisma.posts.create({
      data: {
        // TS: đảm bảo luôn có content_md theo schema
        content_md: trimmedMd,
        ...sanitizedBase,
        user_id: userId,
        moderation_status: 'approved',
      },
    });

    // 2. Process and create media records from uploaded files
    if (files && files.length > 0) {
      const mediaData = files.map((file, index) => {
        const mediaType = file.mimetype.startsWith('video/')
          ? 'video'
          : 'image';
        // Sử dụng helper function để lấy URL theo format: videos/filename hoặc postimages/filename
        const mediaUrl = getPostFileUrl(file);
        return {
          post_id: post.id,
          media_url: mediaUrl,
          media_type: mediaType,
          sort_order: index,
        };
      });

      await this.prisma.post_media.createMany({
        data: mediaData,
      });
    }

    // Thêm products nếu có
    if (product_ids && product_ids.length > 0) {
      await this.prisma.post_products.createMany({
        data: product_ids.map((productId) => ({
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
      data: createdPost.data,
    };
  }

  /**
   * Create post with S3 URLs (already uploaded)
   * Used by presigned URL upload flow
   */
  async createPostWithS3Urls(
    userId: number,
    createPostDto: CreatePostDto,
    mediaUrls: string[],
    coverUrl?: string,
    videoUrl?: string,
  ) {
    const { product_ids, tags, ...postData } = createPostDto;

    // Validate content
    const rawMd = (postData as any)?.content_md as string | undefined;
    const trimmedMd = typeof rawMd === 'string' ? rawMd.trim() : '';
    const hasMedia = mediaUrls.length > 0 || coverUrl || videoUrl;

    if (!trimmedMd && !hasMedia) {
      throw new Error('content_md is required when no media is provided');
    }

    // Sanitize data
    const sanitizedBase = Object.fromEntries(
      Object.entries({
        ...postData,
        post_type: (postData as any)?.post_type ?? 'post',
        visibility: (postData as any)?.visibility ?? 'public',
        content_md: trimmedMd,
      }).filter(([, v]) => v !== undefined),
    );

    // Create post record
    const post = await this.prisma.posts.create({
      data: {
        content_md: trimmedMd,
        ...sanitizedBase,
        user_id: userId,
        moderation_status: 'approved',
      },
    });

    // Create media records from S3 URLs
    let sortOrder = 0;

    // Add cover image first (sort_order: 0)
    if (coverUrl) {
      await this.prisma.post_media.create({
        data: {
          post_id: post.id,
          media_url: coverUrl,
          media_type: 'image',
          sort_order: sortOrder++,
        },
      });
    }

    // Add other images
    for (const mediaUrl of mediaUrls) {
      await this.prisma.post_media.create({
        data: {
          post_id: post.id,
          media_url: mediaUrl,
          media_type: 'image',
          sort_order: sortOrder++,
        },
      });
    }

    // Add video
    if (videoUrl) {
      await this.prisma.post_media.create({
        data: {
          post_id: post.id,
          media_url: videoUrl,
          media_type: 'video',
          sort_order: sortOrder++,
        },
      });
    }

    // Handle product tags
    if (product_ids && product_ids.length > 0) {
      for (const productId of product_ids) {
        await this.prisma.post_products.create({
          data: {
            post_id: post.id,
            product_id: productId,
          },
        });
      }
    }

    // Handle tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Create slug from tag name
        const slug = tagName.toLowerCase().replace(/\s+/g, '-');

        // Find or create tag
        let tag = await this.prisma.tags.findUnique({
          where: { slug },
        });

        if (!tag) {
          tag = await this.prisma.tags.create({
            data: { name: tagName, slug },
          });
        }

        // Create post_tags relation
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
      message: 'Post created successfully with S3 media',
      data: createdPost.data,
    };
  }

  async getPosts(queryDto: QueryPostsDto) {
    const {
      page = 1,
      limit = 10,
      user_id,
      shop_id,
      post_type,
      visibility,
      search,
      moderation_status,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      is_story: false, // Exclude stories from posts list
    };

    if (user_id) where.user_id = user_id;
    if (shop_id) where.shop_id = shop_id;
    if (post_type) where.post_type = post_type;
    if (visibility) where.visibility = visibility;
    if (moderation_status) where.moderation_status = moderation_status;
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
              slug: true,
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
                  product_media: {
                    take: 1,
                    orderBy: { sort_order: 'asc' },
                    select: { url: true },
                  },
                  product_variants: {
                    select: { shade_hex: true },
                  },
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
      }),
    );

    // Normalize post URLs
    const normalizedPosts = postsWithCounts.map((post) =>
      this.normalizePostUrls(post),
    );

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
            slug: true,
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
                product_media: {
                  take: 1,
                  orderBy: { sort_order: 'asc' },
                  select: { url: true },
                },
                product_variants: {
                  select: { shade_hex: true },
                },
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
      data: normalizedPost,
    };
  }

  async updatePost(
    id: number,
    userId: number,
    updatePostDto: UpdatePostDto,
    files?: any[],
  ) {
    const post = await this.prisma.posts.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            owner_id: true,
            shop_staffs: {
              where: { user_id: userId },
              select: { user_id: true }
            }
          }
        }
      }
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Kiểm tra quyền: cho phép sửa nếu:
    // 1. Là người tạo post
    // 2. Post thuộc shop VÀ (user là owner hoặc staff có quyền edit_post)
    const isPostOwner = post.user_id === userId;
    const isShopOwner = post.shop_id && post.shop?.owner_id === userId;
    const isShopStaff = post.shop_id && post.shop?.shop_staffs && post.shop.shop_staffs.length > 0;

    // Check if staff has edit_post permission
    let hasEditPostPermission = false;
    if (isShopStaff && !isShopOwner && post.shop_id) {
      const userPermissions = await this.prisma.userpermission.findMany({
        where: { user_id: userId },
        include: { permission: true },
      });
      hasEditPostPermission = userPermissions.some(
        (up) => up.permission.name === 'edit_post',
      );
    }

    if (!isPostOwner && !isShopOwner && (!isShopStaff || !hasEditPostPermission)) {
      throw new ForbiddenException('You can only update your own posts or posts in your shop');
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

    // Xử lý media nếu có media_urls hoặc có files mới
    if (media_urls !== undefined || (files && files.length > 0)) {
      let finalMediaUrls = Array.isArray(media_urls) ? [...media_urls] : [];

      // Nếu có file mới, thêm vào danh sách
      if (files && files.length > 0) {
        const newFileUrls = files.map((file) => file.location);
        finalMediaUrls = [...finalMediaUrls, ...newFileUrls];
      }

      // Xóa tất cả media cũ và thay bằng danh sách mới
      await this.prisma.post_media.deleteMany({
        where: { post_id: id },
      });

      if (finalMediaUrls.length > 0) {
        await this.prisma.post_media.createMany({
          data: finalMediaUrls.map((url, index) => ({
            post_id: id,
            media_url: url,
            media_type:
              url.includes('.mp4') || url.includes('.mov') ? 'video' : 'image',
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
          data: product_ids.map((productId) => ({
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
      select: {
        user_id: true,
        shop_id: true,
        shop: {
          select: {
            owner_id: true,
            shop_staffs: {
              where: { user_id: userId },
              select: { user_id: true }
            }
          }
        }
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Kiểm tra quyền: cho phép xóa nếu:
    // 1. Là người tạo post
    // 2. Post thuộc shop VÀ (user là owner hoặc staff có quyền delete_post)
    const isPostOwner = post.user_id === userId;
    const isShopOwner = post.shop_id && post.shop?.owner_id === userId;
    const isShopStaff = post.shop_id && post.shop?.shop_staffs && post.shop.shop_staffs.length > 0;

    // Check if staff has delete_post permission
    let hasDeletePostPermission = false;
    if (isShopStaff && !isShopOwner && post.shop_id) {
      const userPermissions = await this.prisma.userpermission.findMany({
        where: { user_id: userId },
        include: { permission: true },
      });
      hasDeletePostPermission = userPermissions.some(
        (up) => up.permission.name === 'delete_post',
      );
    }

    if (!isPostOwner && !isShopOwner && (!isShopStaff || !hasDeletePostPermission)) {
      throw new ForbiddenException('You can only delete your own posts or posts in your shop');
    }

    // Delete post and related data
    await this.deletePostData(id);
    return { message: 'Post deleted successfully' };
  }

  // Helper method to delete post and all related data
  private async deletePostData(id: number) {
    // Xóa các dữ liệu liên quan
    await Promise.all([
      this.prisma.post_media.deleteMany({ where: { post_id: id } }),
      this.prisma.post_products.deleteMany({ where: { post_id: id } }),
      this.prisma.post_tags.deleteMany({ where: { post_id: id } }),
      this.prisma.saved_posts.deleteMany({ where: { post_id: id } }),
      this.prisma.likes.deleteMany({
        where: { target_type: 'post', target_id: id },
      }),
      this.prisma.comments.deleteMany({
        where: { target_type: 'post', target_id: id },
      }),
    ]);

    // Xóa post
    await this.prisma.posts.delete({
      where: { id },
    });
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

    // Sử dụng helper function để lấy URL: postimages/filename
    const coverUrl = getPostFileUrl(file);

    // Create or update cover image in post_media table
    const existingCover = await this.prisma.post_media.findFirst({
      where: {
        post_id: postId,
        sort_order: 0,
      },
    });

    if (existingCover) {
      // Update existing cover
      await this.prisma.post_media.update({
        where: { id: existingCover.id },
        data: {
          media_url: coverUrl,
          media_type: 'image',
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

    // Sử dụng helper function để lấy URL: videos/filename
    const videoUrl = getPostFileUrl(file);

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

    // Create media records using helper function
    const mediaData = files.map((file, index) => {
      const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      // Sử dụng helper function: videos/filename hoặc postimages/filename
      const mediaUrl = getPostFileUrl(file);

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
      throw new ForbiddenException(
        'You can only delete media from your own posts',
      );
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

  // Save/Unsave Posts Methods
  async savePost(userId: number, postId: number) {
    try {
      // Check if post exists
      const post = await this.prisma.posts.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      // Check if already saved
      const existingSave = await this.prisma.saved_posts.findUnique({
        where: {
          user_id_post_id: {
            user_id: userId,
            post_id: postId,
          },
        },
      });

      if (existingSave) {
        return {
          success: false,
          message: 'Post already saved',
          is_saved: true,
        };
      }

      // Save the post
      await this.prisma.saved_posts.create({
        data: {
          user_id: userId,
          post_id: postId,
        },
      });

      return {
        success: true,
        message: 'Post saved successfully',
        is_saved: true,
      };
    } catch (error) {
      console.error('Error saving post:', error);
      return {
        success: false,
        message: 'Failed to save post',
        is_saved: false,
      };
    }
  }

  async unsavePost(userId: number, postId: number) {
    try {
      // Check if post is saved
      const savedPost = await this.prisma.saved_posts.findUnique({
        where: {
          user_id_post_id: {
            user_id: userId,
            post_id: postId,
          },
        },
      });

      if (!savedPost) {
        return {
          success: false,
          message: 'Post is not saved',
          is_saved: false,
        };
      }

      // Remove from saved posts
      await this.prisma.saved_posts.delete({
        where: {
          user_id_post_id: {
            user_id: userId,
            post_id: postId,
          },
        },
      });

      return {
        success: true,
        message: 'Post unsaved successfully',
        is_saved: false,
      };
    } catch (error) {
      console.error('Error unsaving post:', error);
      return {
        success: false,
        message: 'Failed to unsave post',
        is_saved: true,
      };
    }
  }

  async getSavedPosts(userId: number, query: QueryPostsDto) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const where = {
        user_id: userId,
        post: {
          is_story: false, // Exclude stories from saved posts
        },
      };

      // Get saved posts with full post data
      const savedPosts = await this.prisma.saved_posts.findMany({
        where,
        include: {
          post: {
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
                  slug: true,
                  logo_url: true,
                },
              },
              post_media: {
                orderBy: { sort_order: 'asc' },
              },
              post_products: {
                include: {
                  product: {
                    include: {
                      product_variants: {
                        take: 1,
                        orderBy: { created_at: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      });

      // Get total count
      const total = await this.prisma.saved_posts.count({
        where,
      });

      // Transform posts
      const posts = savedPosts.map((savedPost) => ({
        ...this.normalizePostUrls(savedPost.post),
        saved_at: savedPost.created_at,
        is_saved: true, // All posts in this list are saved
      }));

      return {
        success: true,
        data: posts,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching saved posts:', error);
      return {
        success: false,
        message: 'Failed to fetch saved posts',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          total_pages: 0,
        },
      };
    }
  }

  async checkIfPostIsSaved(userId: number, postId: number) {
    try {
      const savedPost = await this.prisma.saved_posts.findUnique({
        where: {
          user_id_post_id: {
            user_id: userId,
            post_id: postId,
          },
        },
      });

      return {
        success: true,
        is_saved: !!savedPost,
        post_id: postId,
      };
    } catch (error) {
      console.error('Error checking if post is saved:', error);
      return {
        success: false,
        is_saved: false,
        post_id: postId,
      };
    }
  }

  /**
   * Moderate a post (Admin only)
   */
  async moderatePost(
    postId: number,
    adminId: number,
    moderateDto: { action: string; reason?: string },
  ) {
    // Verify post exists
    const post = await this.prisma.posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    // Update post moderation status
    const updatedPost = await this.prisma.posts.update({
      where: { id: postId },
      data: {
        moderation_status: moderateDto.action as any,
        updated_at: new Date(),
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
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
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
              },
            },
          },
        },
      },
    });

    const normalizedPost = this.normalizePostUrls(updatedPost);

    return {
      success: true,
      message: `Post ${moderateDto.action} successfully`,
      data: normalizedPost,
    };
  }

  /**
   * Get moderation statistics (Admin only)
   */
  async getModerationStats() {
    const [approved, rejected, removed, total] = await Promise.all([
      this.prisma.posts.count({
        where: { moderation_status: 'approved', is_story: false },
      }),
      this.prisma.posts.count({
        where: { moderation_status: 'rejected', is_story: false },
      }),
      this.prisma.posts.count({
        where: { moderation_status: 'removed', is_story: false },
      }),
      this.prisma.posts.count({
        where: { is_story: false },
      }),
    ]);

    return {
      success: true,
      data: {
        pending: 0, // Deprecated
        approved,
        rejected,
        removed,
        total,
      },
    };
  }
}
