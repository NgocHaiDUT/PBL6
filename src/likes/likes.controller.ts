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
  UseGuards,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { QueryLikesDto } from './dto/query-likes.dto';
import {
  LikeResponse,
  LikeStatsResponse,
  PaginatedLikesResponse,
} from './interfaces/like.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createLikeDto: CreateLikeDto,
    @Request() req: any,
  ): Promise<LikeResponse> {
    // Extract user ID from JWT token
    const userId = req.user.userId;
    return this.likesService.create(createLikeDto, userId);
  }

  @Get()
  async findAll(
    @Query() queryDto: QueryLikesDto,
  ): Promise<PaginatedLikesResponse> {
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
    console.log('📊 [LikesController] Get stats:', {
      targetType,
      targetId,
      userId: finalUserId,
    });
    return this.likesService.getStats(targetType, targetId, finalUserId);
  }

  @Get('totalLikesByUser/:userId')
  async getTotalLikesByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ total_likes: number }> {
    return this.likesService.getTotalLikesByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('toggle/:targetType/:targetId')
  async toggleLike(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Body() body: { userId?: number },
    @Request() req: any,
  ): Promise<{ liked: boolean; total_likes: number }> {
    // Extract user ID from JWT token
    const userId = req.user.userId;
    console.log('🔥 [LikesController] Toggle like:', {
      targetType,
      targetId,
      userId,
    });
    return this.likesService.toggleLike(targetType, targetId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':targetType/:targetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('targetType') targetType: string,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: any,
  ): Promise<void> {
    // Extract user ID from JWT token
    const userId = req.user.userId;
    return this.likesService.remove(targetType, targetId, userId);
  }
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<LikeResponse> {
    return this.likesService.findOne(id);
  }
}
