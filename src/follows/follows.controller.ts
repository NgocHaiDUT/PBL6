import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { FollowsService } from './follows.service';
import { CreateFollowDto } from './dto/create-follow.dto';
import { QueryFollowsDto } from './dto/query-follows.dto';
import {
  FollowResponse,
  FollowStatsResponse,
  PaginatedFollowsResponse,
} from './interfaces/follow.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('follows')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createFollowDto: CreateFollowDto,
    @Request() req: any,
  ): Promise<FollowResponse> {
    // Use user_id from JWT token
    const followerId = req.user.userId;
    return this.followsService.create(createFollowDto, followerId);
  }

  @Get()
  async findAll(
    @Query() queryDto: QueryFollowsDto,
  ): Promise<PaginatedFollowsResponse> {
    return this.followsService.findAll(queryDto);
  }

  @Get('stats/:userId')
  async getStats(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('currentUserId') currentUserId?: number,
  ): Promise<FollowStatsResponse> {
    return this.followsService.getStats(userId, currentUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('toggle/:followingId')
  async toggleFollow(
    @Param('followingId', ParseIntPipe) followingId: number,
    @Body() body: { user_id?: number },
    @Request() req: any,
  ): Promise<{ following: boolean; followers_count: number }> {
    // Use user_id from JWT token
    const followerId = req.user.userId;
    return this.followsService.toggleFollow(followingId, followerId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':followingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('followingId', ParseIntPipe) followingId: number,
    @Body() body: { user_id?: number },
    @Request() req: any,
  ): Promise<void> {
    // Use user_id from JWT token
    const followerId = req.user.userId;
    return this.followsService.remove(followingId, followerId);
  }

  // Helper endpoint to get followers of a user
  @Get('followers/:userId')
  async getFollowers(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedFollowsResponse> {
    const queryDto: QueryFollowsDto = {
      user_id: userId,
      type: 'followers',
      page: page || 1,
      limit: limit || 20,
    };
    return this.followsService.findAll(queryDto);
  }

  // Helper endpoint to get who a user is following
  @Get('following/:userId')
  async getFollowing(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedFollowsResponse> {
    const queryDto: QueryFollowsDto = {
      user_id: userId,
      type: 'following',
      page: page || 1,
      limit: limit || 20,
    };
    return this.followsService.findAll(queryDto);
  }

  // Get mutual friends (users who both follow and are followed by the user)
  @Get('friends/:userId')
  async getMutualFriends(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<any> {
    return this.followsService.getMutualFriends(userId, page || 1, limit || 20);
  }
}
