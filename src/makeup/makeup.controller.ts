// src/makeup/makeup.controller.ts
import { Controller, Get, Query, HttpException, HttpStatus, Param, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { MakeupService } from './makeup.service';
import { UpdateVariantShadeDto } from './dto/update-variant-shade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Makeup')
@ApiSecurity('JWT-auth')
@Controller('makeup')
export class MakeupController {
  constructor(private readonly makeupService: MakeupService) {}

  /**
   * API gợi ý danh sách sản phẩm phù hợp với skintone
   * GET /makeup/recommend?skintone=fair
   */
  @Get('recommend')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Recommend products by skintone', description: 'Gợi ý danh sách sản phẩm phù hợp với skintone. Query param: skintone' })
  @ApiQuery({ name: 'skintone', required: true, description: 'Skintone value, ví dụ: fair, medium, dark' })
  @ApiResponse({ status: 200, description: 'Success - returns recommended products', schema: { example: { success: true, data: [{ id: 1, name: 'Foundation A', skintone: 'fair' }] } } })
  @ApiResponse({ status: 400, description: 'Bad request - Skintone parameter is required' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async recommendProducts(@Query('skintone') skintone: string) {
    if (!skintone) {
      throw new HttpException('Skintone parameter is required', HttpStatus.BAD_REQUEST);
    }

    const products = await this.makeupService.recommendProductsBySkintone(skintone);

    return {
      success: true,
      data: products,
    };
  }

  /**
   * Trả về danh sách sản phẩm được nhóm theo 7 mục makeup
   * GET /makeup/categories?limit=8
   */
  @Get('categories')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get products grouped by makeup categories', description: 'Trả về danh sách sản phẩm theo các mục: lips, eyeshadow, blush, eyeliner, eyebrows, foundation, mascara' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng tối đa sản phẩm trả về cho mỗi mục (mặc định 10)' })
  @ApiResponse({ status: 200, description: 'Success - returns grouped products' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async getProductsByCategories(@Query('limit') limit?: string) {
    const per = limit ? parseInt(limit, 10) : 10;
    const data = await this.makeupService.getProductsByCategories(per);

    return {
      success: true,
      data,
    };
  }

  /**
   * Lấy sản phẩm makeup của shop của user đang đăng nhập
   * GET /makeup/my-shop-products?limit=8
   */
  @Get('my-shop-products')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get makeup products for authenticated user\'s shop', description: 'Trả về sản phẩm makeup của shop mà user đang đăng nhập sở hữu hoặc làm staff. Params: limit' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng tối đa sản phẩm trả về cho mỗi mục (mặc định 10)' })
  @ApiResponse({ status: 200, description: 'Success - returns grouped products for user\'s shop' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Not found - User does not own or work at any shop' })
  async getMyShopProducts(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.userId || req.user.sub;
    const per = limit ? parseInt(limit, 10) : 10;
    const data = await this.makeupService.getMakeupProductsByMyShop(userId, per);
    return { success: true, data };
  }

  /**
   * Lấy sản phẩm makeup của một shop theo các mục (lips, eyeshadow, ...)
   * GET /makeup/shop/:shopId?limit=8
   */
  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get makeup products for a shop', description: 'Trả về sản phẩm makeup của một shop theo các mục. Params: shopId, query: limit' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng tối đa sản phẩm trả về cho mỗi mục (mặc định 10)' })
  @ApiResponse({ status: 200, description: 'Success - returns grouped products for shop' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  async getProductsByShop(
    @Param('shopId') shopId: string,
    @Query('limit') limit?: string,
  ) {
    const shopIdNum = parseInt(shopId, 10);
    if (Number.isNaN(shopIdNum)) {
      throw new HttpException('Invalid shopId', HttpStatus.BAD_REQUEST);
    }
    const per = limit ? parseInt(limit, 10) : 10;
    const data = await this.makeupService.getMakeupProductsByShop(shopIdNum, per);
    return { success: true, data };
  }

  /**
   * Cập nhật shade_hex và opacity cho một product_variant
   * PATCH /makeup/variant/:variantId/shade
   */
  @Patch('variant/:variantId/shade')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update shade_hex and opacity for a product variant', description: 'Cập nhật thông tin màu sắc và độ trong suốt cho một variant. Chỉ chủ shop hoặc staff có quyền' })
  @ApiResponse({ status: 200, description: 'Success - variant updated' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid variantId or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not shop owner or staff' })
  @ApiResponse({ status: 404, description: 'Not found - Variant not found' })
  async updateVariantShade(
    @Req() req: any,
    @Param('variantId') variantId: string,
    @Body() updateData: UpdateVariantShadeDto,
  ) {
    const variantIdNum = parseInt(variantId, 10);
    if (Number.isNaN(variantIdNum)) {
      throw new HttpException('Invalid variantId', HttpStatus.BAD_REQUEST);
    }

    const userId = req.user.userId || req.user.sub;
    const updatedVariant = await this.makeupService.updateVariantShade(variantIdNum, updateData, userId);
    return { success: true, data: updatedVariant };
  }
}
