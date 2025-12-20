import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
// Import S3 config instead of local file config
import {
  s3BrandConfig,
  STORAGE_TYPE,
  generateBrandImageUrl,
  USE_S3,
} from './config/product.config';
import {
  Controller,
  Body,
  Post,
  Get,
  UploadedFile,
  Query,
  UseInterceptors,
  BadRequestException,
  Param,
  ParseIntPipe,
  Put,
  Delete,
  UseGuards,
  Req,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// Import local file config for local testing
// import { s3BrandConfig } from './config/s3-product.config';
import {
  brandMulterConfig,
  productMediaMulterConfig,
} from './config/product-multer.config';
// Import DTOs
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandNameDto } from './dto/update-brand-name.dto';
import { UpdateBrandSlugDto } from './dto/update-brand-slug.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryNameDto } from './dto/update-category-name.dto';
import { UpdateCategorySlugDto } from './dto/update-category-slug.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { QueryShopProductsDto } from './dto/query-shop-products.dto';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { AddProductMediaDto } from './dto/add-product-media.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productservice: ProductService) { }

  @Get('all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all products for management',
    description: 'Retrieve all products in the system regardless of status. Requires manage_product permission.'
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async getAllProductsManager(@Query() query: any) {
    return this.productservice.getAllProductsManager(query);
  }

  // ================== BRANDS ==================

  @Get('brands')
  @ApiOperation({
    summary: 'Get all brands',
    description: 'Retrieve a list of all available makeup brands'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of all brands with their logos and slugs'
  })
  async getAllBrands() {
    return this.productservice.getallbrand();
  }

  @Post('brands')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new brand',
    description: 'Create a new makeup brand with logo upload. Requires manage_brands permission.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'slug', 'file'],
      properties: {
        name: {
          type: 'string',
          example: 'MAC Cosmetics',
          description: 'Brand name'
        },
        slug: {
          type: 'string',
          example: 'mac-cosmetics',
          description: 'URL-friendly brand identifier'
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Brand logo image file'
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Brand created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing file or invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_brands permission' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_BRANDS)
  @UseInterceptors(FileInterceptor('file', brandMulterConfig))
  async createBrand(
    @Body() body: { name: string; slug: string },
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file ảnh');
    }
    const userId = req.user.userId;
    // S3: file.location or file.key, Local: file.filename
    const brandUrl = USE_S3
      ? file.location ||
      `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.key}`
      : `/uploads/brands/${file.filename}`;
    return this.productservice.addbrand(userId, body.name, body.slug, brandUrl);
  }

  @Patch('brands/:brandId/name')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update brand name',
    description: 'Update the name of an existing brand'
  })
  @ApiParam({ name: 'brandId', description: 'Brand ID', type: Number })
  @ApiBody({ type: UpdateBrandNameDto })
  @ApiResponse({ status: 200, description: 'Brand name updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing name field' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_brands permission' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_BRANDS)
  async updateBrandName(
    @Param('brandId', ParseIntPipe) brandId: number,
    @Body('name') name: string,
    @Req() req: any,
  ) {
    if (!name) {
      return { success: false, message: 'Thiếu trường name' };
    }
    const userId = req.user.userId;
    return this.productservice.editbrandname(userId, brandId, name);
  }

  @Patch('brands/:brandId/slug')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update brand slug',
    description: 'Update the URL-friendly slug of an existing brand'
  })
  @ApiParam({ name: 'brandId', description: 'Brand ID', type: Number })
  @ApiBody({ type: UpdateBrandSlugDto })
  @ApiResponse({ status: 200, description: 'Brand slug updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing slug field' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_brands permission' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_BRANDS)
  async updateBrandSlug(
    @Param('brandId', ParseIntPipe) brandId: number,
    @Body('slug') slug: string,
    @Req() req: any,
  ) {
    if (!slug) {
      return { success: false, message: 'Thiếu trường slug' };
    }
    const userId = req.user.userId;
    return this.productservice.editbrandslug(userId, brandId, slug);
  }

  @Patch('brands/:brandId/logo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update brand logo',
    description: 'Update the logo image of an existing brand'
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'brandId', description: 'Brand ID', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'New brand logo image file'
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Brand logo updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_brands permission' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_BRANDS)
  @UseInterceptors(FileInterceptor('file', brandMulterConfig))
  async updateBrandLogo(
    @Param('brandId', ParseIntPipe) brandId: number,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      return { success: false, message: 'Thiếu file ảnh' };
    }
    const userId = req.user.userId;
    const brandUrl = USE_S3
      ? file.location ||
      `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.key}`
      : `/uploads/brands/${file.filename}`;
    return this.productservice.editbrandslogo(userId, brandId, brandUrl);
  }

  @Delete('brands/:brandId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a brand',
    description: 'Delete an existing brand. Only possible if no products are using this brand. Requires manage_brands permission.'
  })
  @ApiParam({ name: 'brandId', description: 'Brand ID', type: Number })
  @ApiResponse({ status: 200, description: 'Brand deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Brand is being used by products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_brands permission' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_BRANDS)
  async deleteBrand(
    @Param('brandId', ParseIntPipe) brandId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.deleteBrand(userId, brandId);
  }

  // ================== CATEGORIES ==================

  @Get('categories')
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Retrieve a list of all product categories including parent and child categories'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of all categories with their hierarchy'
  })
  async getAllCategories() {
    return this.productservice.getallcategories();
  }

  @Post('categories')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new category',
    description: 'Create a new product category. Can be a parent category or subcategory.'
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing required fields' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_categorys permission' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_CATEGORYS)
  async createCategory(
    @Body() body: { parent_id?: string; name: string; slug: string },
    @Req() req: any,
  ) {
    if (!body.name || !body.slug)
      return { success: false, message: 'Thiếu trường' };
    const userId = req.user.userId;
    return this.productservice.addcategory(
      userId,
      body.name,
      body.slug,
      Number(body.parent_id),
    );
  }

  @Patch('categories/:categoryId/name')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update category name',
    description: 'Update the name of an existing category'
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID', type: Number })
  @ApiBody({ type: UpdateCategoryNameDto })
  @ApiResponse({ status: 200, description: 'Category name updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing name field' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_categorys permission' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_CATEGORYS)
  async updateCategoryName(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body('name') name: string,
    @Req() req: any,
  ) {
    if (!name) return { success: false, message: 'Thiếu trường name' };
    const userId = req.user.userId;
    return this.productservice.editnamecategory(userId, categoryId, name);
  }

  @Patch('categories/:categoryId/slug')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update category slug',
    description: 'Update the URL-friendly slug of an existing category'
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID', type: Number })
  @ApiBody({ type: UpdateCategorySlugDto })
  @ApiResponse({ status: 200, description: 'Category slug updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing slug field' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_categorys permission' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage_categorys')
  async updateCategorySlug(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body('slug') slug: string,
    @Req() req: any,
  ) {
    if (!slug) return { success: false, message: 'Thiếu trường slug' };
    const userId = req.user.userId;
    return this.productservice.editslugcategory(userId, categoryId, slug);
  }

  @Delete('categories/:categoryId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a category',
    description: 'Delete an existing category. Only possible if no products are using this category and it has no child categories. Requires manage_categorys permission.'
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID', type: Number })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Category is being used or has children' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_categorys permission' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_CATEGORYS)
  async deleteCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.deleteCategory(userId, categoryId);
  }

  // ================== PRODUCTS ==================

  @Get()
  @ApiOperation({
    summary: 'Get all products',
    description: 'Retrieve a paginated list of products with optional filters for name, brand, category, publication status, and moderation status'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'name', required: false, type: String, description: 'Search by product name (partial match)' })
  @ApiQuery({ name: 'brand', required: false, type: String, description: 'Filter by brand ID or slug' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category ID or slug' })
  @ApiQuery({ name: 'is_published', required: false, type: Boolean, description: 'Filter by publication status (true/false)' })
  @ApiQuery({ name: 'moderation_status', required: false, enum: ['pending', 'approved', 'rejected'], description: 'Filter by moderation status' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'minRating', required: false, type: Number, description: 'Minimum rating filter (0-5)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'General search (deprecated, use "name" instead)' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of products with filters applied'
  })
  async getAllProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('name') name?: string,
    @Query('brand') brand?: string,
    @Query('category') category?: string,
    @Query('is_published') is_published?: string,
    @Query('moderation_status') moderation_status?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('search') search?: string,
  ) {
    return this.productservice.getAllProducts({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      name: name || search, // Support both 'name' and legacy 'search' parameter
      brand,
      category,
      is_published: is_published !== undefined ? is_published === 'true' : undefined,
      moderation_status: moderation_status as any,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search products',
    description: 'Search for products using various criteria'
  })
  @ApiResponse({ status: 200, description: 'Returns search results' })
  async searchProducts(@Query() query: any) {
    return this.productservice.searchProducts(query);
  }

  @Get('filter')
  @ApiOperation({
    summary: 'Filter products',
    description: 'Filter products using advanced criteria'
  })
  @ApiResponse({ status: 200, description: 'Returns filtered products' })
  async filterProducts(@Query() query: any) {
    return this.productservice.filterProducts(query);
  }

  // ================== WISHLIST ==================

  @Get('wishlist')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user wishlist',
    description: 'Retrieve the authenticated user\'s wishlist'
  })
  @ApiResponse({ status: 200, description: 'Returns user wishlist with product details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  async getWishlist(@Req() req: any) {
    const userId = req.user.userId;
    return this.productservice.getWishlist(userId);
  }

  @Post('wishlist')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add product to wishlist',
    description: 'Add a product to the authenticated user\'s wishlist'
  })
  @ApiBody({ type: AddToWishlistDto })
  @ApiResponse({ status: 201, description: 'Product added to wishlist successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid product ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseGuards(JwtAuthGuard)
  async addToWishlist(
    @Body('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.addToWishlist(productId, userId);
  }

  @Delete('wishlist/:productId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove product from wishlist',
    description: 'Remove a product from the authenticated user\'s wishlist'
  })
  @ApiParam({ name: 'productId', description: 'Product ID to remove', type: Number })
  @ApiResponse({ status: 200, description: 'Product removed from wishlist successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found in wishlist' })
  @UseGuards(JwtAuthGuard)
  async removeFromWishlist(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.removeFromWishlist(productId, userId);
  }

  // ================== CART ==================

  @Get('cart')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user cart',
    description: 'Retrieve the authenticated user\'s shopping cart'
  })
  @ApiResponse({ status: 200, description: 'Returns user cart with product details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  async getCart(@Req() req: any) {
    const userId = req.user.userId;
    return this.productservice.getCart(userId);
  }

  @Post('cart')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add product to cart',
    description: 'Add a product (with optional variant) to the authenticated user\'s cart'
  })
  @ApiBody({ type: AddToCartDto })
  @ApiResponse({ status: 201, description: 'Product added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product or variant not found' })
  @UseGuards(JwtAuthGuard)
  async addToCart(
    @Body() body: { productId: number; variantId?: number; quantity: number },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.addToCart(
      body.productId,
      body.variantId,
      body.quantity,
      userId,
    );
  }

  // ================== PRODUCT MODERATION ==================

  @Get('pending/:productId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get pending product details',
    description: 'Retrieve detailed information about a product with pending moderation status. Requires manage_product permission.'
  })
  @ApiParam({ name: 'productId', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns pending product details with variants, images, and categories' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_product permission' })
  @ApiResponse({ status: 404, description: 'Product not found or not in pending status' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async getPendingProductDetails(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.getPendingProductDetails(productId, userId);
  }

  @Patch(':productId/approve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Approve a pending product',
    description: 'Change the moderation status of a product from pending to approved. Requires manage_product permission.'
  })
  @ApiParam({ name: 'productId', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Product approved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Product is not in pending status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_product permission' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async approveProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.approveProduct(productId, userId);
  }

  // ================== PRODUCT DETAILS ==================

  // Public endpoint to get product by slug (must come before :productId)
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get product by slug',
    description: 'Retrieve product details using its URL-friendly slug. Only returns published and approved products.'
  })
  @ApiParam({ name: 'slug', description: 'Product slug', type: String, example: 'ruby-woo-lipstick' })
  @ApiResponse({ status: 200, description: 'Returns product details with variants, images, and reviews' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductBySlug(@Param('slug') slug: string) {
    return this.productservice.getProductBySlug(slug);
  }

  @Get(':productId')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieve product details using its ID. Only returns published and approved products.'
  })
  @ApiParam({ name: 'productId', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns product details with variants, images, and reviews' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(@Param('productId', ParseIntPipe) productId: number) {
    return this.productservice.getProductById(productId);
  }

  // Protected endpoint for sellers to get product details (including unpublished/pending)
  @Get(':productId/manage')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get product for management',
    description: 'Retrieve product details for management purposes. Includes unpublished and pending products. Requires manage_product permission.'
  })
  @ApiParam({ name: 'productId', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Returns complete product details including all statuses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_product permission or product ownership' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async getProductByIdForManagement(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.getProductByIdForManagement(productId, userId);
  }

  // ================== PRODUCT CRUD ==================

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Create a new product for a shop. Requires manage_product permission.'
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing required fields or invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_product permission' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async createProduct(
    @Body()
    body: {
      shop_id: string;
      name: string;
      slug?: string;
      is_published: boolean;
      how_to_use?: string;
      description?: string;
      brand_id?: string;
      category_ids?: any[];
    },
    @Req() req: any,
  ) {
    if (!body.shop_id || !body.name) {
      return {
        success: false,
        message: 'Thiếu trường bắt buộc (shop_id, name)',
      };
    }

    const categoryIds = body.category_ids
      ? body.category_ids.map((id) => Number(id))
      : undefined;
    const userId = req.user.userId;
    return this.productservice.addproducts(
      userId,
      Number(body.shop_id),
      body.name,
      body.slug || '',
      body.is_published ?? false,
      body.how_to_use,
      body.description,
      body.brand_id ? Number(body.brand_id) : undefined,
      categoryIds,
    );
  }

  @Put(':productId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a product',
    description: 'Update an existing product. Requires manage_product permission and product ownership.'
  })
  @ApiParam({ name: 'productId', description: 'Product ID', type: Number })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_product permission or product ownership' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async updateProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Body()
    body: {
      name?: string;
      slug?: string;
      description?: string;
      how_to_use?: string;
      is_published?: boolean;
      brand_id?: string;
      category_ids?: any[];
    },
    @Req() req: any,
  ) {
    const categoryIds = body.category_ids
      ? body.category_ids.map((id) => Number(id))
      : undefined;

    const userId = req.user.userId;
    return this.productservice.editProduct(
      productId,
      userId,
      body.name,
      body.slug,
      body.description,
      body.how_to_use,
      body.is_published,
      body.brand_id ? Number(body.brand_id) : undefined,
      categoryIds,
    );
  }

  @Delete(':productId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a product',
    description: 'Delete an existing product. Only admin users can delete products. Requires manage_product permission and admin role.'
  })
  @ApiParam({ name: 'productId', description: 'Product ID', type: Number })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only admin can delete products' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async deleteProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.deleteProduct(productId, userId);
  }

  // ================== PRODUCT VARIANTS ==================

  @Post('variants')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a product variant',
    description: 'Create a new variant for a product (e.g., different colors, sizes). Requires manage_product permission.'
  })
  @ApiBody({ type: CreateProductVariantDto })
  @ApiResponse({ status: 201, description: 'Product variant created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing required fields' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_product permission' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async createProductVariant(
    @Body()
    body: {
      product_id: string;
      sku: string;
      name: string;
      price: string;
      stock?: string;
      shade_hex?: string;
      size_label?: string;
      compare_at_price?: string;
      opacity?: string;
    },
    @Req() req: any,
  ) {
    if (!body.product_id || !body.sku || !body.name || !body.price) {
      return { success: false, message: 'Thiếu trường bắt buộc' };
    }

    return this.productservice.addProductVariant(
      Number(body.product_id),
      body.sku,
      body.name,
      Number(body.price),
      body.stock ? Number(body.stock) : 0,
      body.shade_hex,
      body.size_label,
      body.compare_at_price ? Number(body.compare_at_price) : undefined,
      body.opacity ? Number(body.opacity) : undefined,
    );
  }

  @Put('variants/:variantId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a product variant',
    description: 'Update an existing product variant. Requires manage_product permission.'
  })
  @ApiParam({ name: 'variantId', description: 'Variant ID', type: Number })
  @ApiBody({ type: UpdateProductVariantDto })
  @ApiResponse({ status: 200, description: 'Product variant updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_product permission' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async updateProductVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body()
    body: {
      sku?: string;
      name?: string;
      price?: string;
      stock?: string;
      shade_hex?: string;
      size_label?: string;
      compare_at_price?: string;
      is_active?: boolean;
      opacity?: string;
    },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.editProductVariant(
      variantId,
      userId,
      body.sku,
      body.name,
      body.price ? Number(body.price) : undefined,
      body.stock ? Number(body.stock) : undefined,
      body.shade_hex,
      body.size_label,
      body.compare_at_price ? Number(body.compare_at_price) : undefined,
      body.is_active,
      body.opacity ? Number(body.opacity) : undefined,
    );
  }

  @Delete('variants/:variantId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a product variant',
    description: 'Delete an existing product variant. Requires manage_product permission.'
  })
  @ApiParam({ name: 'variantId', description: 'Variant ID', type: Number })
  @ApiResponse({ status: 200, description: 'Product variant deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_product permission' })
  @ApiResponse({ status: 404, description: 'Variant not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  async deleteProductVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.deleteProductVariant(variantId, userId);
  }

  // ================== PRODUCT MEDIA ==================

  @Post(':productId/media')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add product media',
    description: 'Upload an image or video for a product. Requires manage_product permission.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'productId', description: 'Product ID', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Product image or video file'
        },
        type: {
          type: 'string',
          enum: ['image', 'video'],
          default: 'image',
          description: 'Media type'
        },
        sort_order: {
          type: 'number',
          default: 0,
          description: 'Display order of the media'
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Product media added successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Missing file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Requires manage_product permission' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_PRODUCT)
  @UseInterceptors(FileInterceptor('file', productMediaMulterConfig))
  async addProductMedia(
    @Param('productId', ParseIntPipe) productId: number,
    @Body('type') type?: string,
    @Body('sort_order') sortOrder?: string,
    @UploadedFile() file?: any,
    @Req() req?: any,
  ) {
    if (!file) {
      return { success: false, message: 'Thiếu file ảnh' };
    }

    const mediaUrl = USE_S3
      ? file.location ||
      `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.key}`
      : `/uploads/products/${file.filename}`;

    return this.productservice.addProductMedia(
      productId,
      mediaUrl,
      type || 'image',
      sortOrder ? Number(sortOrder) : 0,
    );
  }

  // ================== SHOP PRODUCTS ==================

  @Get('shops/:shopId')
  @ApiOperation({
    summary: 'Get shop products',
    description: 'Retrieve all products from a specific shop with pagination and filters'
  })
  @ApiParam({ name: 'shopId', description: 'Shop ID', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by product name' })
  @ApiQuery({ name: 'category_id', required: false, type: Number, description: 'Filter by category ID' })
  @ApiQuery({ name: 'brand_id', required: false, type: Number, description: 'Filter by brand ID' })
  @ApiQuery({ name: 'is_published', required: false, type: Boolean, description: 'Filter by published status' })
  @ApiQuery({ name: 'min_price', required: false, type: Number, description: 'Minimum price filter' })
  @ApiQuery({ name: 'max_price', required: false, type: Number, description: 'Maximum price filter' })
  @ApiQuery({ name: 'sort_field', required: false, enum: ['created_at', 'updated_at', 'name', 'avg_rating', 'review_count'], description: 'Field to sort by' })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of shop products' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async getShopProducts(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category_id') category_id?: string,
    @Query('brand_id') brand_id?: string,
    @Query('is_published') is_published?: string,
    @Query('min_price') min_price?: string,
    @Query('max_price') max_price?: string,
    @Query('sort_field') sort_field?: string,
    @Query('sort_order') sort_order?: string,
  ) {
    // Parse pagination
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;

    // Build filters
    const filters: any = {};
    if (search) filters.search = search;
    if (category_id) filters.category_id = parseInt(category_id);
    if (brand_id) filters.brand_id = parseInt(brand_id);
    if (is_published !== undefined)
      filters.is_published = is_published === 'true';
    if (min_price) filters.min_price = parseFloat(min_price);
    if (max_price) filters.max_price = parseFloat(max_price);

    // Build sort
    let sort: any = undefined;
    if (sort_field) {
      const validFields = [
        'created_at',
        'updated_at',
        'name',
        'avg_rating',
        'review_count',
      ];
      if (validFields.includes(sort_field)) {
        sort = {
          field: sort_field as any,
          order: sort_order === 'asc' ? 'asc' : 'desc',
        };
      }
    }

    return this.productservice.getShopProducts(
      shopId,
      pageNum,
      limitNum,
      Object.keys(filters).length > 0 ? filters : undefined,
      sort,
    );
  }


}
