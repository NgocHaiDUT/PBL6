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
import { AuthGuard } from '@nestjs/passport';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) { }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: any,
  ): Promise<CommentResponse> {
    const userId = req.user.userId;
    return this.commentsService.create(createCommentDto, userId);
  }

  @Get()
  async findAll(@Query() queryDto: QueryCommentsDto): Promise<PaginatedCommentsResponse> {
    return this.commentsService.findAll(queryDto);
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

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: any,
  ): Promise<CommentResponse> {
    const userId = req.user.userId;
    return this.commentsService.update(id, updateCommentDto, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<void> {
    const userId = req.user.userId;
    return this.commentsService.remove(id, userId);
  }
}