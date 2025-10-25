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
import { 
  coverImageStorage, 
  videoStorage, 
  mediaStorage,
  imageFileFilter,
  videoFileFilter,
  mediaFileFilter 
} from './config/multer.config';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  create(@Body() createPostDto: CreatePostDto, @Req() req: any) {
    // const userId = req.user.id; // Lấy từ JWT token
    
    // Lấy userId từ body hoặc từ headers
    const userId = createPostDto.user_id || req.headers['x-user-id'] || req.body.user_id;
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    return this.postsService.createPost(Number(userId), createPostDto);
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
    const userId = updatePostDto.user_id || req.headers['x-user-id'] || req.body.user_id || 1;
    return this.postsService.updatePost(id, Number(userId), updatePostDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = req.headers['x-user-id'] || req.body.user_id || 1;
    return this.postsService.deletePost(id, Number(userId));
  }





  // Upload cover image for post
  @Post(':id/upload-cover')
  @UseInterceptors(FileInterceptor('cover', {
    storage: coverImageStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  }))
  // @UseGuards(JwtAuthGuard)
  uploadCoverImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    // const userId = req.user.id;
    const userId = req.headers['x-user-id'] || req.body.user_id || 1;
    console.log('🔍 uploadCoverImage controller:', { 
      postId: id, 
      headerUserId: req.headers['x-user-id'], 
      bodyUserId: req.body.user_id,
      finalUserId: userId 
    });
    return this.postsService.uploadCoverImage(id, Number(userId), file);
  }

  // Upload video for post
  @Post(':id/upload-video')
  @UseInterceptors(FileInterceptor('video', {
    storage: videoStorage,
    fileFilter: videoFileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for videos
  }))
  // @UseGuards(JwtAuthGuard)
  uploadVideo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    // const userId = req.user.id;
    const userId = req.headers['x-user-id'] || req.body.user_id || 1;
    return this.postsService.uploadVideo(id, Number(userId), file);
  }

  // Upload additional media (images/videos) for post
  @Post(':id/upload-media')
  @UseInterceptors(FilesInterceptor('media', 10, {
    storage: mediaStorage,
    fileFilter: mediaFileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB per file
  }))
  // @UseGuards(JwtAuthGuard)
  uploadAdditionalMedia(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    // const userId = req.user.id;
    const userId = req.headers['x-user-id'] || req.body.user_id || 1;
    console.log('🔍 uploadAdditionalMedia controller:', { 
      postId: id, 
      headerUserId: req.headers['x-user-id'], 
      bodyUserId: req.body.user_id,
      finalUserId: userId 
    });
    return this.postsService.uploadAdditionalMedia(id, Number(userId), files);
  }

  // Delete media from post
  @Delete('media/:mediaId')
  // @UseGuards(JwtAuthGuard)
  deleteMedia(
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id;
    const userId = req.headers['x-user-id'] || req.body.user_id || 1;
    return this.postsService.deleteMedia(mediaId, Number(userId));
  }
}
