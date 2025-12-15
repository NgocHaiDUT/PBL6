import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto, SearchType } from './dto/search.dto';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) { }

  /**
   * Tìm kiếm posts
   */
  async searchPosts(query: string, limit: number = 20) {
    const posts = await this.prisma.posts.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content_md: { contains: query, mode: 'insensitive' } },
              { user: { full_name: { contains: query, mode: 'insensitive' } } },
            ],
          },
          {
            is_story: false, // Exclude stories from search
          },
          {
            post_type: {
              in: ['post', 'image', 'text'], // Include 'post' type which is used in database
            },
          },
          {
            moderation_status: {
              in: ['pending', 'approved'], // Include both pending and approved posts
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
        post_media: {
          orderBy: {
            sort_order: 'asc',
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });

    return posts.map((post) => ({
      type: 'post',
      id: post.id,
      title: post.title,
      content_snippet: post.content_md?.substring(0, 150) || '',
      user: {
        id: post.user.id,
        full_name: post.user.full_name,
        avatar_url: post.user.avatar_url,
      },
      like_count: post.like_count || 0,
      comment_count: 0, // TODO: Add comment count if needed
      created_at: post.created_at.toISOString(),
      post_media: post.post_media.map(media => ({
        id: media.id,
        media_url: media.media_url,
        media_type: media.media_type,
        sort_order: media.sort_order,
      })),
    }));
  }

  /**
   * Tìm kiếm users
   */
  async searchUsers(query: string, limit: number = 20) {
    const users = await this.prisma.users.findMany({
      where: {
        OR: [
          { full_name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { story: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        full_name: true,
        avatar_url: true,
        story: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });

    return users.map((user) => ({
      type: 'user',
      id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      story: user.story,
    }));
  }

  /**
   * Tìm kiếm shops
   */
  async searchShops(query: string, limit: number = 20) {
    const shops = await this.prisma.shops.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo_url: true,
        description: true,
        is_verified: true,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });

    return shops.map((shop) => ({
      type: 'shop',
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      logo_url: shop.logo_url,
      description: shop.description,
      is_verified: shop.is_verified,
    }));
  }

  /**
   * Tìm kiếm hashtags
   */
  async searchHashtags(query: string, limit: number = 20) {
    const tags = await this.prisma.tags.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            post_tags: true,
          },
        },
      },
      orderBy: {
        post_tags: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return tags.map((tag) => ({
      type: 'hashtag',
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      post_count: tag._count.post_tags,
    }));
  }

  /**
   * Tìm kiếm tổng hợp
   */
  async searchAll(dto: SearchQueryDto) {
    const { q, type, limit = 20 } = dto;

    // Nếu có type filter, chỉ search loại đó
    if (type) {
      switch (type) {
        case SearchType.POST:
          return {
            success: true,
            data: {
              results: await this.searchPosts(q, limit),
              total: await this.countPosts(q),
            },
          };
        case SearchType.USER:
          return {
            success: true,
            data: {
              results: await this.searchUsers(q, limit),
              total: await this.countUsers(q),
            },
          };
        case SearchType.SHOP:
          return {
            success: true,
            data: {
              results: await this.searchShops(q, limit),
              total: await this.countShops(q),
            },
          };
        case SearchType.HASHTAG:
          return {
            success: true,
            data: {
              results: await this.searchHashtags(q, limit),
              total: await this.countHashtags(q),
            },
          };
      }
    }

    // Tìm kiếm tất cả
    const [posts, users, shops, hashtags] = await Promise.all([
      this.searchPosts(q, Math.floor(limit / 2)),
      this.searchUsers(q, Math.floor(limit / 4)),
      this.searchShops(q, Math.floor(limit / 4)),
      this.searchHashtags(q, Math.floor(limit / 4)),
    ]);

    return {
      success: true,
      data: {
        posts,
        users,
        shops,
        hashtags,
        total: {
          posts: posts.length,
          users: users.length,
          shops: shops.length,
          hashtags: hashtags.length,
        },
      },
    };
  }

  /**
   * Autocomplete suggestions
   */
  async autocomplete(query: string, limit: number = 5) {
    const [users, posts, shops] = await Promise.all([
      this.prisma.users.findMany({
        where: {
          full_name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
        },
        take: limit,
      }),
      this.prisma.posts.findMany({
        where: {
          is_story: false, // Exclude stories from suggestions
          title: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          title: true,
        },
        take: limit,
      }),
      this.prisma.shops.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          logo_url: true,
        },
        take: limit,
      }),
    ]);

    const suggestions = [
      ...users.map((u) => ({
        type: 'user',
        id: u.id,
        suggestion: u.full_name,
        image_url: u.avatar_url,
      })),
      ...posts.map((p) => ({
        type: 'post',
        id: p.id,
        suggestion: p.title,
        image_url: null,
      })),
      ...shops.map((s) => ({
        type: 'shop',
        id: s.id,
        suggestion: s.name,
        image_url: s.logo_url,
      })),
    ];

    return {
      success: true,
      data: {
        suggestions: suggestions.slice(0, limit),
      },
    };
  }

  // Helper methods to count results
  private async countPosts(query: string): Promise<number> {
    return this.prisma.posts.count({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content_md: { contains: query, mode: 'insensitive' } },
              { user: { full_name: { contains: query, mode: 'insensitive' } } },
            ],
          },
          {
            post_type: { in: ['post', 'image', 'text'] },
          },
          {
            moderation_status: {
              in: ['pending', 'approved'],
            },
          },
        ],
      },
    });
  }

  private async countUsers(query: string): Promise<number> {
    return this.prisma.users.count({
      where: {
        OR: [
          { full_name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }

  private async countShops(query: string): Promise<number> {
    return this.prisma.shops.count({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }

  private async countHashtags(query: string): Promise<number> {
    return this.prisma.tags.count({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }
}
