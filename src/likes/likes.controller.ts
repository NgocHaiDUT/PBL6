import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Request,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { QueryLikesDto } from './dto/query-likes.dto';
import { LikeResponse, LikeStatsResponse, PaginatedLikesResponse } from './interfaces/like.interface';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createLikeDto: CreateLikeDto,
    @Request() req: any,
  ): Promise<LikeResponse> {
    // TODO: Extract user ID from JWT token when auth is implemented
    const userId = req.user?.id || 1; // Temporary fallback
    return this.likesService.create(createLikeDto, userId);
  }

  @Get()
  async findAll(@Query() queryDto: QueryLikesDto): Promise<PaginatedLikesResponse> {
    return this.likesService.findAll(queryDto);
  }

  @Get('stats/:targetType/:targetId')
  async getStats(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: any,
    @Query('userId') userId?: number,
  ): Promise<LikeStatsResponse> {
    // Extract user ID from query or JWT token
    const finalUserId = userId || req.user?.id;
    console.log('📊 [LikesController] Get stats:', { targetType, targetId, userId: finalUserId });
    return this.likesService.getStats(targetType, targetId, finalUserId);
  }

  @Post('toggle/:targetType/:targetId')
  async toggleLike(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Body() body: { userId?: number },
    @Request() req: any,
  ): Promise<{ liked: boolean; total_likes: number }> {
    // Extract user ID from body or JWT token
    const userId = body.userId || req.user?.id || 1;
    console.log('🔥 [LikesController] Toggle like:', { targetType, targetId, userId });
    return this.likesService.toggleLike(targetType, targetId, userId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<LikeResponse> {
    return this.likesService.findOne(id);
  }

  @Delete(':targetType/:targetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: any,
  ): Promise<void> {
    // TODO: Extract user ID from JWT token when auth is implemented
    const userId = req.user?.id || 1; // Temporary fallback
    return this.likesService.remove(targetType, targetId, userId);
  }
}