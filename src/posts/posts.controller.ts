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
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { s3PostCoverConfig, s3PostVideoConfig, s3PostMediaConfig } from './config/s3-post.config';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) { }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.CREATE_POST)
  @UseInterceptors(
    FilesInterceptor('media', 10, s3PostMediaConfig),
  )
  create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: any,
    @UploadedFiles() files: any[],
  ) {
    const userId = req.user.userId;
    return this.postsService.createPost(userId, createPostDto, files);
  }

  @Get()
  findAll(@Query() queryDto: QueryPostsDto) {
    return this.postsService.getPosts(queryDto);
  }

  // Save/Unsave Posts Endpoints - Must be before :id route
  @Get('saved')
  @UseGuards(AuthGuard('jwt'))
  getSavedPosts(
    @Query() query: QueryPostsDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.getSavedPosts(userId, query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getPostById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.EDIT_POST)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.updatePost(id, userId, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.DELETE_POST)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId;
    return this.postsService.deletePost(id, userId);
  }

  @Post(':id/upload-cover')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.EDIT_POST)
  @UseInterceptors(
    FileInterceptor('cover', s3PostCoverConfig),
  )
  uploadCoverImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.uploadCoverImage(id, userId, file);
  }

  @Post(':id/upload-video')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.EDIT_POST)
  @UseInterceptors(
    FileInterceptor('video', s3PostVideoConfig),
  )
  uploadVideo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.uploadVideo(id, userId, file);
  }

  @Post(':id/upload-media')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.EDIT_POST)
  @UseInterceptors(
    FilesInterceptor('media', 10, s3PostMediaConfig),
  )
  uploadAdditionalMedia(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    console.log('📸 [PostsController] Upload media request received:', {
      postId: id,
      filesCount: files?.length || 0,
      userId: req.user?.userId,
      headers: req.headers['content-type'],
    });
    const userId = req.user.userId;
    return this.postsService.uploadAdditionalMedia(id, userId, files);
  }

  @Delete('media/:mediaId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'))
  savePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.savePost(userId, postId);
  }

  @Delete(':id/save')
  @UseGuards(AuthGuard('jwt'))
  unsavePost(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.unsavePost(userId, postId);
  }

  @Get(':id/is-saved')
  @UseGuards(AuthGuard('jwt'))
  checkIfPostIsSaved(
    @Param('id', ParseIntPipe) postId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.checkIfPostIsSaved(userId, postId);
  }
}
