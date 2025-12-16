import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchService } from './search.service';
import { SearchQueryDto, AutocompleteDto } from './dto/search.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Search endpoint tổng hợp
   * GET /search?q=beauty&type=post&limit=20
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async search(@Query() dto: SearchQueryDto) {
    console.log('🔍 [SearchController] Search query:', dto);
    return this.searchService.searchAll(dto);
  }

  /**
   * Search posts
   * GET /search/posts?q=skincare&limit=20
   */
  @Get('posts')
  @UseGuards(JwtAuthGuard)
  async searchPosts(@Query() dto: SearchQueryDto) {
    console.log('🔍 [SearchController] Search posts:', dto.q);
    const results = await this.searchService.searchPosts(dto.q, dto.limit);
    return {
      success: true,
      data: {
        results,
        total: results.length,
      },
    };
  }

  /**
   * Search users
   * GET /search/users?q=john&limit=20
   */
  @Get('users')
  @UseGuards(JwtAuthGuard)
  async searchUsers(@Query() dto: SearchQueryDto) {
    console.log('🔍 [SearchController] Search users:', dto.q);
    const results = await this.searchService.searchUsers(dto.q, dto.limit);
    return {
      success: true,
      data: {
        results,
        total: results.length,
      },
    };
  }

  /**
   * Search shops
   * GET /search/shops?q=beauty&limit=20
   */
  @Get('shops')
  @UseGuards(JwtAuthGuard)
  async searchShops(@Query() dto: SearchQueryDto) {
    console.log('🔍 [SearchController] Search shops:', dto.q);
    const results = await this.searchService.searchShops(dto.q, dto.limit);
    return {
      success: true,
      data: {
        results,
        total: results.length,
      },
    };
  }

  /**
   * Search hashtags
   * GET /search/hashtags?q=makeup&limit=20
   */
  @Get('hashtags')
  @UseGuards(JwtAuthGuard)
  async searchHashtags(@Query() dto: SearchQueryDto) {
    console.log('🔍 [SearchController] Search hashtags:', dto.q);
    const results = await this.searchService.searchHashtags(dto.q, dto.limit);
    return {
      success: true,
      data: {
        results,
        total: results.length,
      },
    };
  }

  /**
   * Autocomplete suggestions
   * GET /search/autocomplete?q=bea&limit=5
   */
  @Get('autocomplete')
  @UseGuards(JwtAuthGuard)
  async autocomplete(@Query() dto: AutocompleteDto) {
    console.log('🔍 [SearchController] Autocomplete:', dto.q);
    return this.searchService.autocomplete(dto.q, dto.limit);
  }
}
