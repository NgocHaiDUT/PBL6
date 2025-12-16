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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { QueryStoriesDto } from './dto/query-stories.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { AddReplyDto } from './dto/add-reply.dto';
import {
  s3StoryMediaConfig,
  getStoryFileUrl,
  STORY_IMAGE_MAX_SIZE,
  STORY_VIDEO_MAX_SIZE,
  STORY_VIDEO_MAX_DURATION,
  getStorageDriver,
} from './config/s3-story.config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs/promises';
import * as path from 'path';

@Controller('story')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  /**
   * POST /story - Create a new story
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('media', s3StoryMediaConfig))
  async createStory(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() createStoryDto: CreateStoryDto,
  ) {
    console.log('📸 [StoryController] Create story request:', {
      userId: req.user?.userId || req.user?.sub,
      hasFile: !!file,
      fileSize: file?.size,
      fileMimetype: file?.mimetype,
      dto: createStoryDto,
      bodyKeys: Object.keys(req.body || {}),
    });

    const userId = req.user.userId || req.user.sub;
    if (!file) {
      throw new BadRequestException('Media file is required');
    }

    // Validate story_type
    if (!createStoryDto.story_type) {
      console.error('❌ [StoryController] Missing story_type');
      throw new BadRequestException('story_type is required (image or video)');
    }

    if (!['image', 'video'].includes(createStoryDto.story_type)) {
      console.error(
        '❌ [StoryController] Invalid story_type:',
        createStoryDto.story_type,
      );
      throw new BadRequestException(
        'story_type must be either "image" or "video"',
      );
    }

    // Parse product_ids if it's a string (from FormData)
    if (typeof createStoryDto.product_ids === 'string') {
      try {
        createStoryDto.product_ids = JSON.parse(
          createStoryDto.product_ids as any,
        );
      } catch (e) {
        console.error('Error parsing product_ids:', e);
        createStoryDto.product_ids = [];
      }
    }

    // Parse duration if it's a string (from FormData)
    if (typeof createStoryDto.duration === 'string') {
      createStoryDto.duration = parseInt(createStoryDto.duration as any, 10);
    }

    const storageDriver = getStorageDriver();
    let mediaUrl: string;
    let thumbnailUrl: string | undefined;

    try {
      // Get media URL from S3 or local storage
      mediaUrl = getStoryFileUrl(file);

      // Validate file based on type
      if (file.mimetype.startsWith('image')) {
        // Validate image size (client should resize before upload)
        if (file.size > STORY_IMAGE_MAX_SIZE) {
          if (storageDriver === 'local' && file.path) {
            await fs.unlink(file.path).catch(() => {});
          }
          throw new BadRequestException('Image size exceeds 10MB limit');
        }
      } else if (file.mimetype.startsWith('video')) {
        // Validate video size
        if (file.size > STORY_VIDEO_MAX_SIZE) {
          if (storageDriver === 'local' && file.path) {
            await fs.unlink(file.path).catch(() => {});
          }
          throw new BadRequestException('Video size exceeds 50MB limit');
        }

        // Client should send duration in DTO for videos
        // Set default if not provided
        if (!createStoryDto.duration) {
          createStoryDto.duration = 15; // Default 15 seconds
        }

        // Validate duration (client should trim video to 30s max before upload)
        if (createStoryDto.duration > STORY_VIDEO_MAX_DURATION) {
          throw new BadRequestException('Video duration exceeds 30 seconds');
        }
      }

      // Create story in database
      return await this.storyService.createStory(
        userId,
        createStoryDto,
        mediaUrl,
        thumbnailUrl,
      );
    } catch (error) {
      console.error('❌ [StoryController] Error creating story:', {
        error: error.message,
        stack: error.stack,
        userId,
        dto: createStoryDto,
      });

      // Cleanup uploaded file on error (only for local storage)
      if (storageDriver === 'local' && file.path) {
        try {
          await fs.unlink(file.path).catch(() => {});
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
      throw error;
    }
  }

  /**
   * GET /story - Get active stories
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getStories(@Req() req: any, @Query() queryDto: QueryStoriesDto) {
    const userId = req.user.userId || req.user.sub;
    return this.storyService.getActiveStories(queryDto, userId);
  }

  /**
   * GET /story/:id - Get a specific story
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getStory(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.storyService.getStoryById(id, userId);
  }

  /**
   * PUT /story/:id - Update story
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateStory(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() updateDto: UpdateStoryDto,
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.storyService.updateStory(id, userId, updateDto);
  }

  /**
   * DELETE /story/:id - Delete story
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteStory(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.storyService.deleteStory(id, userId);
  }

  /**
   * POST /story/:id/view - Mark story as viewed
   */
  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  async markAsViewed(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.storyService.markAsViewed(id, userId);
  }

  /**
   * POST /story/:id/reaction - Add reaction to story
   */
  @Post(':id/reaction')
  @UseGuards(JwtAuthGuard)
  async addReaction(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() reactionDto: AddReactionDto,
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.storyService.addReaction(id, userId, reactionDto);
  }

  /**
   * DELETE /story/:id/reaction - Remove reaction from story
   */
  @Delete(':id/reaction')
  @UseGuards(JwtAuthGuard)
  async removeReaction(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.storyService.removeReaction(id, userId);
  }

  /**
   * POST /story/:id/reply - Add reply to story
   */
  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  async addReply(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() replyDto: AddReplyDto,
  ) {
    const userId = req.user.userId || req.user.sub;
    return this.storyService.addReply(id, userId, replyDto);
  }

  /**
   * GET /story/:id/viewers - Get list of viewers (only owner)
   */
  @Get(':id/viewers')
  @UseGuards(JwtAuthGuard)
  async getViewers(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId || req.user.sub;
    return this.storyService.getViewers(id, userId);
  }

  /**
   * POST /story/presigned-url - Generate presigned URL for direct S3 upload
   * ⚡ FAST UPLOAD: Client upload trực tiếp lên S3, không qua backend
   */
  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  async generatePresignedUrl(
    @Req() req: any,
    @Body()
    body: { fileName: string; fileType: string; storyType: 'image' | 'video' },
  ) {
    const userId = req.user.userId || req.user.sub;

    console.log('🔑 [StoryController] Generating presigned URL:', {
      userId,
      fileName: body.fileName,
      fileType: body.fileType,
      storyType: body.storyType,
    });

    // Validate input
    if (!body.fileName || !body.fileType || !body.storyType) {
      throw new BadRequestException(
        'fileName, fileType, and storyType are required',
      );
    }

    if (!['image', 'video'].includes(body.storyType)) {
      throw new BadRequestException(
        'storyType must be either "image" or "video"',
      );
    }

    // Only work with S3 storage
    const storageDriver = getStorageDriver();
    if (storageDriver !== 's3') {
      throw new ForbiddenException(
        'Presigned URL only available for S3 storage. Current: ' +
          storageDriver,
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
    const directory =
      body.storyType === 'video' ? 'stories/videos' : 'stories/images';
    const key = `${directory}/story-${userId}-${timestamp}-${randomId}.${extension}`;

    // Create presigned URL (valid for 10 minutes)
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      ContentType: body.fileType,
      // Optional: Add metadata
      Metadata: {
        userId: userId.toString(),
        uploadedAt: new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 }); // 10 minutes

    // Generate public S3 URL
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;

    console.log('✅ [StoryController] Presigned URL generated:', {
      key,
      expiresIn: 600,
    });

    return {
      success: true,
      data: {
        uploadUrl, // URL để upload
        s3Url, // URL sau khi upload xong
        key, // S3 key
        expiresIn: 600, // 10 minutes
      },
    };
  }

  /**
   * POST /story/complete-upload - Complete story upload after S3 upload
   * Được gọi SAU KHI mobile app đã upload trực tiếp lên S3
   */
  @Post('complete-upload')
  @UseGuards(JwtAuthGuard)
  async completeUpload(
    @Req() req: any,
    @Body()
    body: {
      s3Url: string;
      story_type: 'image' | 'video';
      caption?: string;
      duration?: number;
      background_color?: string;
      text_color?: string;
      text_position?: string;
      product_ids?: number[];
      thumbnail_url?: string;
    },
  ) {
    const userId = req.user.userId || req.user.sub;

    console.log('💾 [StoryController] Complete upload:', {
      userId,
      s3Url: body.s3Url,
      storyType: body.story_type,
      hasCaption: !!body.caption,
      productCount: body.product_ids?.length || 0,
    });

    // Validate required fields
    if (!body.s3Url || !body.story_type) {
      throw new BadRequestException('s3Url and story_type are required');
    }

    if (!['image', 'video'].includes(body.story_type)) {
      throw new BadRequestException(
        'story_type must be either "image" or "video"',
      );
    }

    // Validate video duration
    if (body.story_type === 'video') {
      if (!body.duration || body.duration <= 0) {
        throw new BadRequestException('duration is required for video stories');
      }
      if (body.duration > STORY_VIDEO_MAX_DURATION) {
        throw new BadRequestException(
          `Video duration cannot exceed ${STORY_VIDEO_MAX_DURATION} seconds`,
        );
      }
    }

    const createStoryDto: CreateStoryDto = {
      story_type: body.story_type,
      caption: body.caption,
      duration: body.duration,
      background_color: body.background_color,
      text_color: body.text_color,
      text_position: body.text_position,
      product_ids: body.product_ids,
    };

    // Create story in database
    const story = await this.storyService.createStory(
      userId,
      createStoryDto,
      body.s3Url, // Media URL already uploaded to S3
      body.thumbnail_url, // Optional thumbnail
    );

    console.log(
      '✅ [StoryController] Story created:',
      story.data?.id || 'unknown',
    );

    return story;
  }
}
