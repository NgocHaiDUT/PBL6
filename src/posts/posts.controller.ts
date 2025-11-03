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

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  create(@Body() createPostDto: CreatePostDto, @Req() req: any) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.postsService.createPost(userId, createPostDto);
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
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.postsService.updatePost(id, userId, updatePostDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.postsService.deletePost(id, userId);
  }

  // Upload cover image for post
  @Post(':id/upload-cover')
  @UseInterceptors(FileInterceptor('cover', getMulterOptions('postimages')))
  // @UseGuards(JwtAuthGuard)
  uploadCoverImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // const userId = req.user.id;
    const userId = 1; // Mock user ID
    return this.postsService.uploadCoverImage(id, userId, file);
  }

  // Upload video for post
  @Post(':id/upload-video')
  @UseInterceptors(FileInterceptor('video', getMulterOptions('videos')))
  // @UseGuards(JwtAuthGuard)
  uploadVideo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    // const userId = req.user.id;
    const userId = 1; // Mock user ID
    return this.postsService.uploadVideo(id, userId, file);
  }

  // Upload additional media (images/videos) for post
  @Post(':id/upload-media')
  @UseInterceptors(FilesInterceptor('media', 10, getMulterOptions('postimages')))
  // @UseGuards(JwtAuthGuard)
  uploadAdditionalMedia(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: any[],
    @Req() req: any,
  ) {
    // const userId = req.user.id;
    const userId = 1; // Mock user ID
    return this.postsService.uploadAdditionalMedia(id, userId, files);
  }

  // Delete media from post
  @Delete('media/:mediaId')
  // @UseGuards(JwtAuthGuard)
  deleteMedia(
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id;
    const userId = 1; // Mock user ID
    return this.postsService.deleteMedia(mediaId, userId);
  }
}
