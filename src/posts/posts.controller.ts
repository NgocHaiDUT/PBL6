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
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryPostsDto } from './dto/query-posts.dto';

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

  @Post(':id/like')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  likePost(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.postsService.likePost(id, userId);
  }

  @Delete(':id/like')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  unlikePost(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.postsService.unlikePost(id, userId);
  }

  @Post(':id/comments')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.postsService.addComment(id, userId, createCommentDto);
  }

  @Get(':id/comments')
  getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.postsService.getComments(id, page, limit);
  }

  @Delete('comments/:commentId')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.postsService.deleteComment(commentId, userId);
  }

  @Post('comments/:commentId/like')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  likeComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.postsService.likeComment(commentId, userId);
  }

  @Delete('comments/:commentId/like')
  // @UseGuards(JwtAuthGuard) // Uncomment khi có auth guard
  unlikeComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: any,
  ) {
    // const userId = req.user.id; // Lấy từ JWT token
    const userId = 1; // Mock user ID for now
    return this.postsService.unlikeComment(commentId, userId);
  }

  @Get('comments/:commentId/likes')
  getCommentLikes(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.postsService.getCommentLikes(commentId, page, limit);
  }
}
