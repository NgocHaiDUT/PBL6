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
import { getMulterOptions } from '../config/storage.config';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('create_post')
  @UseInterceptors(
    FilesInterceptor('media', 10, getMulterOptions('postimages', 'media')),
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

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getPostById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('edit_post')
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
  @RequirePermissions('delete_post')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId;
    return this.postsService.deletePost(id, userId);
  }

  @Post(':id/upload-cover')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('edit_post')
  @UseInterceptors(
    FileInterceptor('cover', getMulterOptions('postimages', 'image')),
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
  @RequirePermissions('edit_post')
  @UseInterceptors(
    FileInterceptor('video', getMulterOptions('videos', 'video')),
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
  @RequirePermissions('edit_post')
  @UseInterceptors(
    FilesInterceptor('media', 10, getMulterOptions('postimages', 'media')),
  )
  uploadAdditionalMedia(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.uploadAdditionalMedia(id, userId, files);
  }

  @Delete('media/:mediaId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('edit_post')
  deleteMedia(
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.postsService.deleteMedia(mediaId, userId);
  }
}
