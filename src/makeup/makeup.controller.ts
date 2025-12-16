// src/makeup/makeup.controller.ts
import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MakeupService } from './makeup.service';

@ApiTags('Makeup')
@Controller('makeup')
export class MakeupController {
  constructor(private readonly makeupService: MakeupService) {}

  /**
   * API gợi ý danh sách sản phẩm phù hợp với skintone
   * GET /makeup/recommend?skintone=fair
   */
  @Get('recommend')
  @ApiOperation({ summary: 'Recommend products by skintone', description: 'Gợi ý danh sách sản phẩm phù hợp với skintone. Query param: skintone' })
  @ApiQuery({ name: 'skintone', required: true, description: 'Skintone value, ví dụ: fair, medium, dark' })
  @ApiResponse({ status: 200, description: 'Success - returns recommended products', schema: { example: { success: true, data: [{ id: 1, name: 'Foundation A', skintone: 'fair' }] } } })
  @ApiResponse({ status: 400, description: 'Bad request - Skintone parameter is required' })
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
  @ApiOperation({ summary: 'Get products grouped by makeup categories', description: 'Trả về danh sách sản phẩm theo các mục: lips, eyeshadow, blush, eyeliner, eyebrows, foundation, mascara' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số lượng tối đa sản phẩm trả về cho mỗi mục (mặc định 10)' })
  @ApiResponse({ status: 200, description: 'Success - returns grouped products' })
  async getProductsByCategories(@Query('limit') limit?: string) {
    const per = limit ? parseInt(limit, 10) : 10;
    const data = await this.makeupService.getProductsByCategories(per);

    return {
      success: true,
      data,
    };
  }
}
