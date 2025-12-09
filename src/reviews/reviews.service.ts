import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { getFileUrl } from '../config/storage.config';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  // Create a new review
  async createReview(createReviewDto: CreateReviewDto, userId: number) {
    const { product_id, rating, title, content, media_url, is_verified_purchase } = createReviewDto;
    const user_id = userId;

    console.log('🔍 [ReviewsService] Creating review with data:', {
      user_id,
      product_id,
      rating,
      title,
      content
    });

    try {
      // Check if user already reviewed this product
      const existingReview = await this.prisma.reviews.findUnique({
        where: {
          user_id_product_id: {
            user_id,
            product_id,
          },
        },
      });

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this product');
      }

      // Check if product exists
      const product = await this.prisma.products.findUnique({
        where: { id: product_id },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Create review
      const review = await this.prisma.reviews.create({
        data: {
          user_id,
          product_id,
          rating,
          title: title || null,
          content: content || null,
          media_url: media_url || null,
          is_verified_purchase: is_verified_purchase || false,
        },
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      // Update product average rating and review count
      await this.updateProductRating(product_id);

      return {
        success: true,
        message: 'Review created successfully',
        data: review,
      };
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  // Get reviews with filters and pagination
  async getReviews(queryDto: QueryReviewsDto) {
    const { product_id, user_id, rating, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (product_id) where.product_id = product_id;
    if (user_id) where.user_id = user_id;
    if (rating) where.rating = rating;

    const [reviews, total] = await Promise.all([
      this.prisma.reviews.findMany({
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
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.reviews.count({ where }),
    ]);

    return {
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get review by ID
  async getReviewById(id: number) {
    const review = await this.prisma.reviews.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return {
      success: true,
      data: review,
    };
  }

  // Get product rating summary
  async getProductRatingSummary(productId: number) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
      select: {
        avg_rating: true,
        review_count: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get rating distribution
    const ratingCounts = await this.prisma.reviews.groupBy({
      by: ['rating'],
      where: { product_id: productId },
      _count: {
        rating: true,
      },
    });

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratingCounts.forEach((item) => {
      distribution[item.rating] = item._count.rating;
    });

    return {
      success: true,
      data: {
        avg_rating: product.avg_rating ? parseFloat(product.avg_rating.toString()) : 0,
        review_count: product.review_count,
        distribution,
      },
    };
  }

  // Update review
  async updateReview(id: number, userId: number, updateReviewDto: UpdateReviewDto) {
    const review = await this.prisma.reviews.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.user_id !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.reviews.update({
      where: { id },
      data: updateReviewDto,
      include: {
        user: {
          select: {
            id: true,
            full_name: true,
            avatar_url: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Update product rating if rating changed
    if (updateReviewDto.rating !== undefined) {
      await this.updateProductRating(review.product_id);
    }

    return {
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    };
  }

  // Delete review
  async deleteReview(id: number, userId: number) {
    const review = await this.prisma.reviews.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const productId = review.product_id;

    await this.prisma.reviews.delete({
      where: { id },
    });

    // Update product rating after deletion
    await this.updateProductRating(productId);

    return {
      success: true,
      message: 'Review deleted successfully',
    };
  }

  // Upload review media
  async uploadReviewMedia(reviewId: number, userId: number, file: any) {
    const review = await this.prisma.reviews.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.user_id !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const mediaUrl = getFileUrl(file, 'reviews');

    const updatedReview = await this.prisma.reviews.update({
      where: { id: reviewId },
      data: { media_url: mediaUrl },
    });

    return {
      success: true,
      message: 'Review media uploaded successfully',
      data: { media_url: mediaUrl },
    };
  }

  // Helper: Update product average rating
  private async updateProductRating(productId: number) {
    const stats = await this.prisma.reviews.aggregate({
      where: { product_id: productId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.products.update({
      where: { id: productId },
      data: {
        avg_rating: stats._avg.rating || 0,
        review_count: stats._count.id,
      },
    });
  }
}
