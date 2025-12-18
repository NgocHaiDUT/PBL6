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
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { getMulterOptions, getFileUrl } from '../config/storage.config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Create review
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    const userId = req.user.userId || req.user.id; // Support both userId and id
    return this.reviewsService.createReview(createReviewDto, userId);
  }

  // Get reviews with filters
  @Get()
  async getReviews(@Query() queryDto: QueryReviewsDto) {
    return this.reviewsService.getReviews(queryDto);
  }

  // Get product rating summary
  @Get('products/:productId/summary')
  async getProductRatingSummary(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.reviewsService.getProductRatingSummary(productId);
  }

  // Get review by ID
  @Get(':id')
  async getReviewById(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getReviewById(id);
  }

  // Update review
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(id, req.user.id, updateReviewDto);
  }

  // Delete review
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteReview(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.reviewsService.deleteReview(id, req.user.id);
  }

  // Upload review media
  @Post(':id/media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('media', getMulterOptions('reviews', 'image')),
  )
  async uploadReviewMedia(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @UploadedFile() file: any,
  ) {
    const userId = req.user.userId || req.user.id;
    return this.reviewsService.uploadReviewMedia(id, userId, file);
  }

  // Upload temp image for new reviews
  @Post('upload-temp')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('media', getMulterOptions('reviews', 'image')),
  )
  async uploadTempMedia(@Request() req, @UploadedFile() file: any) {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      };
    }

    const mediaUrl = getFileUrl(file, 'reviews');
    return {
      success: true,
      message: 'File uploaded successfully',
      data: { url: mediaUrl },
    };
  }

  /**
   * POST /reviews/presigned-url - Generate presigned URL for review media
   * ⚡ FAST: Direct S3 upload for review images
   */
  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  async generatePresignedUrl(
    @Request() req,
    @Body()
    body: {
      fileName: string;
      fileType: string;
    },
  ) {
    const userId = req.user.userId || req.user.id;

    // Validate
    if (!body.fileName || !body.fileType) {
      throw new BadRequestException('fileName and fileType are required');
    }

    // Only work with S3
    const storageDriver = process.env.STORAGE_DRIVER || 'local';
    if (storageDriver !== 's3') {
      throw new ForbiddenException(
        'Presigned URL only available for S3 storage',
      );
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Generate unique key
    const timestamp = Date.now();
    const randomId = Math.round(Math.random() * 1e9);
    const extension = body.fileName.split('.').pop();
    const key = `reviews/review-${userId}-${timestamp}-${randomId}.${extension}`;

    // Create presigned URL (valid for 10 minutes)
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      ContentType: body.fileType,
      Metadata: {
        userId: userId.toString(),
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;

    return {
      success: true,
      data: {
        uploadUrl,
        s3Url,
        key,
        expiresIn: 600,
      },
    };
  }
}
