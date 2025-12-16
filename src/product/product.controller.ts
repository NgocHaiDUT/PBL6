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
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/constants/Permission.enum';
// Import local file config for local testing
// import { s3BrandConfig } from './config/s3-product.config';
import {
  brandMulterConfig,
  productMediaMulterConfig,
} from './config/product-multer.config';

@Controller('products')
export class ProductController {
  constructor(private readonly productservice: ProductService) {}

  @Get('brands')
  async getAllBrands() {
    console.log('Controller - getAllBrands called');
    return this.productservice.getallbrand();
  }

  @Post('brands')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @Get('categories')
  async getAllCategories() {
    console.log('Controller - getAllCategories called');
    return this.productservice.getallcategories();
  }

  @Post('categories')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  points;
  @Get()
  async getAllProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('search') search?: string,
  ) {
    return this.productservice.getAllProducts({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      category,
      brand,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      search,
    });
  }

  @Get('search')
  async searchProducts(@Query() query: any) {
    return this.productservice.searchProducts(query);
  }

  @Get('filter')
  async filterProducts(@Query() query: any) {
    return this.productservice.filterProducts(query);
  }

  @Get(':productId')
  async getProductById(@Param('productId', ParseIntPipe) productId: number) {
    return this.productservice.getProductById(productId);
  }
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_brands')
  @UseInterceptors(FileInterceptor('file', brandMulterConfig))
  async addbrand(
    @Body() body: { name: string; slug: string },
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file ảnh');
    }
    const userId = req.user.userId;
    const brandUrl = USE_S3
      ? file.location ||
        `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.key}`
      : `/uploads/brands/${file.filename}`;
    return this.productservice.addbrand(userId, body.name, body.slug, brandUrl);
  }

  @Post('edit-brand-name')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_brands')
  async editbrandname(
    @Body() body: { id: string; name: string },
    @Req() req: any,
  ) {
    if (!body.id || !body.name) {
      return { success: false, message: 'Thiếu trường' };
    }
    const userId = req.user.userId;
    return this.productservice.editbrandname(
      userId,
      Number(body.id),
      body.name,
    );
  }

  @Post('edit-brand-slug')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.MANAGE_CATEGORYS)
  async editbrandslug(
    @Body() body: { id: string; slug: string },
    @Req() req: any,
  ) {
    if (!body.id || !body.slug) {
      return { success: false, message: 'Thiếu trường' };
    }
    const userId = req.user.userId;
    return this.productservice.editbrandslug(
      userId,
      Number(body.id),
      body.slug,
    );
  }

  @Post('edit-brand-logo')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('manage_brands')
  @UseInterceptors(FileInterceptor('file', brandMulterConfig))
  async editbrandlogo(
    @Body() body: { id: string },
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!body.id || !file) {
      return { success: false, message: 'Thiếu trường hoặc file ảnh' };
    }
    const userId = req.user.userId;
    const brandUrl = USE_S3
      ? file.location ||
        `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.key}`
      : `/uploads/brands/${file.filename}`;
    return this.productservice.editbrandslogo(
      userId,
      Number(body.id),
      brandUrl,
    );
  }

  // Product CRUD
  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.CREATE_PRODUCT)
  async createProduct(
    @Body()
    body: {
      shop_id: string;
      name: string;
      slug?: string;
      skin_type_compat: string;
      is_published: boolean;
      how_to_use?: string;
      description?: string;
      brand_id?: string;
      category_ids?: any[];
    },
    @Req() req: any,
  ) {
    if (!body.shop_id || !body.name || !body.skin_type_compat) {
      return {
        success: false,
        message: 'Thiếu trường bắt buộc (shop_id, name, skin_type_compat)',
      };
    }

    const validSkinTypes = [
      'unknown',
      'normal',
      'oily',
      'dry',
      'combination',
      'sensitive',
    ];
    if (!validSkinTypes.includes(body.skin_type_compat)) {
      return {
        success: false,
        message: `skin_type_compat không hợp lệ. Chỉ chấp nhận: ${validSkinTypes.join(', ')}`,
        received: body.skin_type_compat,
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
      body.skin_type_compat as any,
      body.is_published ?? false,
      body.how_to_use,
      body.description,
      body.brand_id ? Number(body.brand_id) : undefined,
      categoryIds,
    );
  }

  @Put(':productId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PRODUCT)
  async updateProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Body()
    body: {
      name?: string;
      slug?: string;
      description?: string;
      how_to_use?: string;
      skin_type_compat?: string;
      is_published?: boolean;
      brand_id?: string;
      category_ids?: any[];
    },
    @Req() req: any,
  ) {
    if (body.skin_type_compat) {
      const validSkinTypes = [
        'unknown',
        'normal',
        'oily',
        'dry',
        'combination',
        'sensitive',
      ];
      if (!validSkinTypes.includes(body.skin_type_compat)) {
        return {
          success: false,
          message: `skin_type_compat không hợp lệ. Chỉ chấp nhận: ${validSkinTypes.join(', ')}`,
          received: body.skin_type_compat,
        };
      }
    }

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
      body.skin_type_compat as any,
      body.is_published,
      body.brand_id ? Number(body.brand_id) : undefined,
      categoryIds,
    );
  }

  @Delete(':productId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.DELETE_PRODUCT)
  async deleteProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.deleteProduct(productId, userId);
  }

  // Product Variants
  @Post('variants')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('create_product')
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
    );
  }

  @Put('variants/:variantId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.EDIT_PRODUCT)
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
    );
  }

  @Delete('variants/:variantId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions(Permission.DELETE_PRODUCT)
  async deleteProductVariant(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.deleteProductVariant(variantId, userId);
  }

  // Product Media
  @Post(':productId/media')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('edit_product')
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

  // Shop Products
  @Get('shops/:shopId')
  async getShopProducts(
    @Param('shopId', ParseIntPipe) shopId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category_id') category_id?: string,
    @Query('brand_id') brand_id?: string,
    @Query('is_published') is_published?: string,
    @Query('skin_type') skin_type?: string,
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
    if (skin_type) filters.skin_type = skin_type;
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

  // Wishlist
  @Get('wishlist')
  @UseGuards(JwtAuthGuard)
  async getWishlist(@Req() req: any) {
    const userId = req.user.userId;
    return this.productservice.getWishlist(userId);
  }

  @Post('wishlist')
  @UseGuards(JwtAuthGuard)
  async addToWishlist(
    @Body('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.addToWishlist(productId, userId);
  }

  @Delete('wishlist/:productId')
  @UseGuards(JwtAuthGuard)
  async removeFromWishlist(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.productservice.removeFromWishlist(productId, userId);
  }

  // Cart
  @Get('cart')
  @UseGuards(JwtAuthGuard)
  async getCart(@Req() req: any) {
    const userId = req.user.userId;
    return this.productservice.getCart(userId);
  }

  @Post('cart')
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

  @Put('cart/items/:itemId')
  @UseGuards(JwtAuthGuard)
  async updateCartItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body('quantity', ParseIntPipe) quantity: number,
    @Req() req: any,
  ) {
    return this.productservice.updateCartItem(itemId, quantity);
  }

  @Delete('cart/items/:itemId')
  @UseGuards(JwtAuthGuard)
  async removeFromCart(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Req() req: any,
  ) {
    return this.productservice.removeFromCart(itemId);
  }
}
