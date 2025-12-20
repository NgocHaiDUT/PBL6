import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { ModeratePostDto } from './dto/moderate-post.dto';
import {
  s3PostCoverConfig,
  s3PostVideoConfig,
  s3PostMediaConfig,
} from './config/s3-post.config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CREATE_POST)
  @UseInterceptors(FilesInterceptor('media', 10, s3PostMediaConfig))
  create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: any,
    @UploadedFiles() files: any[],
  ) {
    const userId = req.user.userId;
    return this.postsService.createPost(userId, createPostDto, files);
  }

  @Get()
  findAll(@Query() queryDto: QueryPostsDto, @Req() req: any) {
    const currentUserId = req.user?.userId; // May be undefined if not authenticated
    return this.postsService.getPosts(queryDto, currentUserId);
  }

  // Get posts by user ID - Must be before :id route
  @Get('user/:userId')
  getPostsByUserId(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() queryDto: QueryPostsDto,
    @Req() req: any,
  ) {
    const currentUserId = req.user?.userId;
    // Override user_id in queryDto with the userId from params
    const query = { ...queryDto, user_id: userId };
    return this.postsService.getPosts(query, currentUserId);
  }

  // Following feed - Must be before :id route
  @Get('following')
  @UseGuards(JwtAuthGuard)
  getFollowingPosts(@Query() query: QueryPostsDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.postsService.getFollowingPosts(userId, query);
  }

  // Save/Unsave Posts Endpoints - Must be before :id route
  @Get('saved')
  @UseGuards(JwtAuthGuard)
  getSavedPosts(@Query() query: QueryPostsDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.postsService.getSavedPosts(userId, query);
  }

  // Moderation endpoints - Must be before :id route
  @Patch(':id/moderate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MODERATE_POST)
  async moderatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() moderateDto: ModeratePostDto,
    @Req() req: any,
  ) {
    const adminId = req.user.userId;
    return this.postsService.moderatePost(id, adminId, moderateDto);
  }

  @Get('stats/moderation')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.VIEW_MODERATION_STATS)
  async getModerationStats() {
    return this.postsService.getModerationStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getPostById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_POST)
  @UseInterceptors(FilesInterceptor('media', 10, s3PostMediaConfig))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.updatePost(id, userId, updatePostDto, files);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.DELETE_POST)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId;
    return this.postsService.deletePost(id, userId);
  }

  @Post(':id/upload-cover')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_POST)
  @UseInterceptors(FileInterceptor('cover', s3PostCoverConfig))
  uploadCoverImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.uploadCoverImage(id, userId, file);
  }

  @Post(':id/upload-video')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_POST)
  @UseInterceptors(FileInterceptor('video', s3PostVideoConfig))
  uploadVideo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.uploadVideo(id, userId, file);
  }

  @Post(':id/upload-media')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_POST)
  @UseInterceptors(FilesInterceptor('media', 10, s3PostMediaConfig))
  uploadAdditionalMedia(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.uploadAdditionalMedia(id, userId, files);
  }

  @Delete('media/:mediaId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.EDIT_POST)
  deleteMedia(
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.deleteMedia(mediaId, userId);
  }

  // Save/Unsave Posts Endpoints
  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  savePost(@Param('id', ParseIntPipe) postId: number, @Req() req: any) {
    const userId = req.user.userId;
    return this.postsService.savePost(userId, postId);
  }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  unsavePost(@Param('id', ParseIntPipe) postId: number, @Req() req: any) {
    const userId = req.user.userId;
    return this.postsService.unsavePost(userId, postId);
  }

  @Get(':id/is-saved')
  @UseGuards(JwtAuthGuard)
  checkIfPostIsSaved(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.checkIfPostIsSaved(userId, postId);
  }

  /**
   * POST /posts/presigned-url - Generate presigned URL for direct S3 upload
   * ⚡ FAST UPLOAD: Client upload trực tiếp lên S3
   */
  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  async generatePresignedUrl(
    @Req() req: any,
    @Body()
    body: {
      fileName: string;
      fileType: string;
      mediaType: 'cover' | 'image' | 'video';
      postId?: number;
    },
  ) {
    const userId = req.user.userId || req.user.sub;

    // Validate input
    if (!body.fileName || !body.fileType || !body.mediaType) {
      throw new BadRequestException(
        'fileName, fileType, and mediaType are required',
      );
    }

    if (!['cover', 'image', 'video'].includes(body.mediaType)) {
      throw new BadRequestException(
        'mediaType must be "cover", "image", or "video"',
      );
    }

    // Only work with S3 storage
    const storageDriver = process.env.STORAGE_DRIVER || 'local';
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
    let directory = '';

    switch (body.mediaType) {
      case 'cover':
        directory = 'posts/covers';
        break;
      case 'video':
        directory = 'posts/videos';
        break;
      case 'image':
      default:
        directory = 'posts/images';
        break;
    }

    const key = `${directory}/post-${userId}-${timestamp}-${randomId}.${extension}`;

    // Create presigned URL (valid for 10 minutes)
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
      ContentType: body.fileType,
      Metadata: {
        userId: userId.toString(),
        uploadedAt: new Date().toISOString(),
        mediaType: body.mediaType,
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    // Generate public S3 URL
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

  /**
   * POST /posts/complete-upload - Lưu post sau khi upload media lên S3
   */
  @Post('complete-upload')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.CREATE_POST)
  async completeUpload(
    @Req() req: any,
    @Body()
    body: {
      mediaUrls: string[]; // Array of S3 URLs
      postData: CreatePostDto;
      coverUrl?: string;
      videoUrl?: string;
    },
  ) {
    const userId = req.user.userId || req.user.sub;

    // Validate
    if (!body.postData) {
      throw new BadRequestException('postData is required');
    }

    // Create post with S3 URLs
    return this.postsService.createPostWithS3Urls(
      userId,
      body.postData,
      body.mediaUrls || [],
      body.coverUrl,
      body.videoUrl,
    );
  }
}
