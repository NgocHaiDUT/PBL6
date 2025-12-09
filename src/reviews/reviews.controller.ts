import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { getMulterOptions } from '../config/storage.config';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Create review
  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    console.log('🔍 [ReviewsController] User from JWT:', req.user);
    console.log('🔍 [ReviewsController] Review DTO:', createReviewDto);
    const userId = req.user.userId || req.user.id; // Support both userId and id
    console.log('🔍 [ReviewsController] Using userId:', userId);
    return this.reviewsService.createReview(createReviewDto, userId);
  }

  // Get reviews with filters
  @Get()
  async getReviews(@Query() queryDto: QueryReviewsDto) {
    return this.reviewsService.getReviews(queryDto);
  }

  // Get product rating summary
  @Get('products/:productId/summary')
  async getProductRatingSummary(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.getProductRatingSummary(productId);
  }

  // Get review by ID
  @Get(':id')
  async getReviewById(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getReviewById(id);
  }

  // Update review
  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(id, req.user.id, updateReviewDto);
  }

  // Delete review
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async deleteReview(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.reviewsService.deleteReview(id, req.user.id);
  }

  // Upload review media
  @Post(':id/media')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('media', getMulterOptions('reviews', 'image')))
  async uploadReviewMedia(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @UploadedFile() file: any,
  ) {
    console.log('🖼️ [ReviewsController] Upload review media - File received:', file ? {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    } : 'No file received');

    const userId = req.user.userId || req.user.id;
    return this.reviewsService.uploadReviewMedia(id, userId, file);
  }

  // Upload temp image for new reviews
  @Post('upload-temp')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('media', getMulterOptions('reviews', 'image')))
  async uploadTempMedia(
    @Request() req,
    @UploadedFile() file: any,
  ) {
    console.log('🖼️ [ReviewsController] Upload temp media - File received:', file ? {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    } : 'No file received');

    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      };
    }

    const mediaUrl = file.location || `/uploads/reviews/${file.filename}`;
    return {
      success: true,
      message: 'File uploaded successfully',
      data: { url: mediaUrl },
    };
  }
}
