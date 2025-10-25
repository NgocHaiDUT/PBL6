import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { CommentResponse, PaginatedCommentsResponse } from './interfaces/comment.interface';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: any,
  ): Promise<CommentResponse> {
    // Use user_id from request body, fallback to JWT token, then fallback to 1
    const userId = createCommentDto.user_id || req.user?.id || 1;
    console.log('💬 [Controller] Creating comment with user ID:', userId, 'from:', {
      fromBody: createCommentDto.user_id,
      fromToken: req.user?.id,
      fallback: 1
    });
    return this.commentsService.create(createCommentDto, userId);
  }

  @Get()
  async findAll(@Query() queryDto: QueryCommentsDto): Promise<PaginatedCommentsResponse> {
    console.log('💬 [Controller] Getting comments with query:', queryDto);
    const result = await this.commentsService.findAll(queryDto);
    console.log('💬 [Controller] Returning comments:', {
      count: result.data.length,
      total: result.total,
      include_replies: queryDto.include_replies,
      sample: result.data[0] ? {
        id: result.data[0].id,
        hasReplies: !!(result.data[0] as any).replies,
        repliesCount: (result.data[0] as any).replies ? (result.data[0] as any).replies.length : 0
      } : null
    });
    return result;
  }
  @Get('all')
  async findAllFlat(@Query('target_id', ParseIntPipe) targetId: number) {
    return this.commentsService.findAllFlat(targetId);
  }


  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<CommentResponse> {
    return this.commentsService.findOne(id);
  }

  @Get(':id/replies')
  async getReplies(@Param('id', ParseIntPipe) id: number): Promise<CommentResponse[]> {
    return this.commentsService.getReplies(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommentDto: UpdateCommentDto & { user_id?: number },
    @Request() req: any,
  ): Promise<CommentResponse> {
    // Use user_id from request body, fallback to JWT token, then fallback to 1
    const userId = updateCommentDto.user_id || req.user?.id || 1;
    console.log('💬 [Controller] Updating comment with user ID:', userId);
    return this.commentsService.update(id, updateCommentDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Query('user_id') userIdQuery: string,
    @Request() req: any,
  ): Promise<void> {
    // Use user_id from query params, fallback to JWT token, then fallback to 1
    const userId = userIdQuery ? parseInt(userIdQuery) : (req.user?.id || 1);
    console.log('💬 [Controller] Deleting comment with user ID:', userId);
    return this.commentsService.remove(id, userId);
  }

  @Post('test/:postId')
  @HttpCode(HttpStatus.CREATED)
  async createTestComments(@Param('postId', ParseIntPipe) postId: number): Promise<{ success: boolean; message: string }> {
    await this.commentsService.createTestCommentsForPost(postId);
    return { success: true, message: 'Test comments created successfully' };
  }
}